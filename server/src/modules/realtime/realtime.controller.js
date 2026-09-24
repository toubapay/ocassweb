const { verifyToken } = require("../../utils/jwt");
const prisma = require("../../lib/prisma");
const { subscribe, channelsForUser, connectionCount } = require("./realtime.bus");

// A comment line every 25s. Nothing reads it - its whole job is to put
// bytes on the wire more often than the idle timeout of whatever sits
// between the app and this process (Render's router, nginx, a mobile
// carrier's NAT), any of which will close a connection that goes quiet for
// 30-60s. Without it the stream dies every minute and EventSource
// reconnects every minute, which is a worse poll than the poll it replaced.
const HEARTBEAT_MS = 25000;

// Sent once, and honoured by EventSource itself: how long the browser waits
// before reconnecting after a drop. The default is 3s in some browsers,
// which turns a backend restart into a stampede.
const RETRY_MS = 5000;

/**
 * Authenticates the stream, accepting the session cookie as well as the
 * Authorization header.
 *
 * The header is what every other route uses and what the Flutter client
 * sends (dio can set headers on a streamed request). The browser cannot:
 * EventSource takes a URL and nothing else - no headers, by specification.
 * So the web client is authenticated by its `ocass-token` cookie, which the
 * app already sets at login (js-cookie, see src/api/client.js) and which
 * the browser attaches to a same-origin EventSource automatically.
 *
 * This cookie fallback is deliberately scoped to this one route rather than
 * added to requireAuth, and that is a security decision, not tidiness: a
 * cookie is sent by the browser on cross-site requests too, so accepting it
 * app-wide would make every state-changing endpoint CSRF-reachable unless a
 * token check were added alongside. This route reads nothing and writes
 * nothing - it only opens a stream of "something changed" pings addressed
 * to the authenticated user - so the same forged request achieves nothing
 * an attacker can read (the response is same-origin-guarded by the browser)
 * or change.
 *
 * The token is never accepted from the query string: morgan logs every URL,
 * and a JWT in an access log is a session sitting in a log file.
 */
async function authenticateStream(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.["ocass-token"];
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return null;
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * `GET /api/realtime/stream` - Server-Sent Events.
 *
 * SSE rather than a WebSocket because every requirement here points one
 * way: the traffic is server-to-client only (a client that wants to *do*
 * something has the REST API), it is ordinary HTTP so it passes through the
 * Next.js proxy and any corporate middlebox that allows the rest of the
 * app, EventSource reconnects on its own in the browser, and it needs no
 * new dependency on either side. A WebSocket would add a server library, a
 * second protocol to authenticate, and a client-side reconnect loop, in
 * exchange for an upstream channel nothing uses.
 */
async function stream(req, res, next) {
  try {
    const user = await authenticateStream(req);
    if (!user) return res.status(401).json({ message: "Authentication required" });

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform matters as much as no-cache: it tells intermediate
      // proxies not to gzip or otherwise rewrite the body, which is what
      // turns a live stream into a buffered one.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx (and Render's router, which is nginx-shaped) buffers proxied
      // responses by default. This is the documented opt-out; without it
      // the first event can sit in a buffer until the buffer fills.
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const send = (event, data) => {
      // One SSE frame. `data` is JSON on a single line - a raw newline
      // inside it would be read as a frame boundary and truncate the event.
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    res.write(`retry: ${RETRY_MS}\n\n`);
    // Sent immediately so the client can distinguish "connected" from
    // "connecting" without waiting for the first real event, and so any
    // buffering proxy in the path is revealed at once rather than the first
    // time something happens.
    send("ready", { userId: user.id, role: user.role, at: new Date().toISOString() });

    const unsubscribe = subscribe(channelsForUser(user), ({ event, data }) => send(event, data));

    const heartbeat = setInterval(() => {
      // A comment frame, ignored by every SSE parser including the
      // browser's.
      res.write(`: ping ${Date.now()}\n\n`);
    }, HEARTBEAT_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    // 'close' fires for a client that navigated away, a phone that lost
    // signal, and a killed app alike. Without this the listener and the
    // interval outlive the connection, and a day of reconnects becomes a
    // leak.
    req.on("close", cleanup);
    res.on("error", cleanup);
  } catch (err) {
    next(err);
  }
}

/**
 * How many live connections this process is holding, for checking that a
 * reconnect replaced a connection rather than adding one.
 */
function stats(req, res) {
  res.json({ connections: connectionCount() });
}

module.exports = { stream, stats };
