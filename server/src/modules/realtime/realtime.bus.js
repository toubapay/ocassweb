const { EventEmitter } = require("events");

/**
 * The in-process fan-out behind `GET /api/realtime/stream`.
 *
 * Something happens in a request handler (a notification is filed, a job is
 * taken off the board) and every client that cares should learn about it
 * without waiting for its next poll. This is the one-hop path from the
 * first to the second: handlers `publish...`, each open SSE connection
 * `subscribe`s to the channels its user belongs to.
 *
 * Two channel kinds, because the two questions have different audiences:
 *
 *   * `user:<id>` — "something arrived for you". One subscriber per open
 *     tab / app instance of that account.
 *   * `role:<ROLE>` — "the shared board changed". A new delivery request is
 *     news for every DELIVERY_AGENT and for ADMIN, and none of them is
 *     the request's owner.
 *
 * **This is per-process, and that is a real limit.** With two or more
 * backend instances behind a load balancer, a client connected to instance
 * B never sees an event published on instance A. It is right for this
 * deploy - render.yaml provisions a single web service and sets no scaling
 * - and it is safe rather than silently wrong, because every client keeps a
 * slow poll as its backstop (see useLiveUpdates.js / live_updates.dart):
 * the worst case is the delay this exists to remove, not stale data
 * forever. The day this app runs more than one instance, the replacement is
 * a shared broker - Redis pub/sub, or Postgres LISTEN/NOTIFY through a raw
 * `pg` client, since Prisma's engine doesn't expose it - behind these same
 * three functions.
 *
 * Nothing here is durable. An event published while a client is offline is
 * gone; the client's reconnect refetches instead of replaying (there is no
 * Last-Event-ID cursor). That is deliberate: the payloads below say *what
 * changed*, never the data itself, so a missed event costs one poll
 * interval rather than a wrong screen.
 */
const bus = new EventEmitter();
// One listener per open connection. Node warns at 11 listeners on a single
// event name by default, and `role:DELIVERY_AGENT` is expected to carry one
// per agent online.
bus.setMaxListeners(0);

const userChannel = (userId) => `user:${userId}`;
const roleChannel = (role) => `role:${role}`;

/**
 * The event vocabulary, kept deliberately small. Clients switch on these
 * names (useLiveUpdates.js, live_updates.dart), so adding one means
 * teaching both clients; changing one means breaking them.
 *
 *   notification — a row was filed in this user's inbox. Payload: the id,
 *                  the type, and `role` ("CUSTOMER"/"AGENT"/"RIDER") so a
 *                  client can tell a job's two sides apart.
 *   jobs         — the set of unassigned jobs changed. Payload: `kind`
 *                  ("delivery"/"ride") and `reason` ("created"/"taken"/
 *                  "cancelled").
 *
 * Neither carries the thing that changed. A client that receives one
 * refetches through the normal authenticated endpoint, so the stream never
 * becomes a second way to read data - and therefore never a second place
 * for an authorization mistake.
 */
const EVENTS = { NOTIFICATION: "notification", JOBS: "jobs" };

function publishToUser(userId, event, data = {}) {
  if (!userId) return;
  bus.emit(userChannel(userId), { event, data });
}

function publishToRoles(roles, event, data = {}) {
  for (const role of roles) {
    bus.emit(roleChannel(role), { event, data });
  }
}

/**
 * Called once per SSE connection with the channels that connection should
 * hear. Returns the unsubscribe function; the route calls it on `close`,
 * which is what keeps a restarted phone from leaving a listener behind.
 */
function subscribe(channels, listener) {
  for (const channel of channels) bus.on(channel, listener);
  return () => {
    for (const channel of channels) bus.off(channel, listener);
  };
}

/** Channels a given user listens on: their own, plus their role's. */
function channelsForUser(user) {
  return [userChannel(user.id), roleChannel(user.role)];
}

/** For /api/health-style introspection and the tests. */
function connectionCount() {
  return bus
    .eventNames()
    .reduce((total, name) => total + bus.listenerCount(name), 0);
}

module.exports = {
  EVENTS,
  publishToUser,
  publishToRoles,
  subscribe,
  channelsForUser,
  connectionCount,
};
