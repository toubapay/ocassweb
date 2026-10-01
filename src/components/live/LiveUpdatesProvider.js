import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "react-query";
import useAuth from "../../hooks/useAuth";

/**
 * Keeps every screen's data current without waiting for a poll, by holding
 * one Server-Sent Events connection to `GET /api/realtime/stream` for as
 * long as someone is signed in.
 *
 * Mounted once in pages/_app.js, so it covers the whole React surface -
 * storefront and admin back office alike - rather than each screen growing
 * its own socket. The stream carries no data, only "this changed", and the
 * handler below turns that into react-query invalidations: the screens keep
 * reading through the same authenticated endpoints they always did, and a
 * cache entry nobody is rendering is simply marked stale rather than
 * refetched. That is what makes this cheap enough to leave running.
 *
 * Same-origin, so the browser attaches the `ocass-token` cookie by itself -
 * EventSource cannot send an Authorization header (see authenticateStream
 * on the server for why the cookie is accepted on this one route). The URL
 * is the relative /api path every other call uses, which middleware.js
 * proxies to BACKEND_URL; SSE survives that proxy - verified, since a
 * buffering proxy would look exactly like a working one until the moment
 * something happened.
 *
 * `connected` is published so pollers can stand down while the stream is
 * up (see POLL_MS / LIVE_POLL_MS at the call sites). The polls are not
 * removed: this is a single-process bus (realtime.bus.js) with no replay,
 * so a dropped connection or a second backend instance has to degrade to
 * the old behaviour rather than to silence.
 */
const LiveContext = createContext({ connected: false, lastEventAt: null });

export function useLiveStatus() {
  return useContext(LiveContext);
}

/** Reconnect backoff for the cases EventSource won't retry by itself. */
const RECONNECT_MIN_MS = 3000;
const RECONNECT_MAX_MS = 60000;

export default function LiveUpdatesProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(null);
  const sourceRef = useRef(null);
  const retryRef = useRef(RECONNECT_MIN_MS);
  const retryTimerRef = useRef(null);

  /**
   * What each event invalidates.
   *
   * `notification` is deliberately broad: every delivery and ride status
   * change files one (delivery.notify.js / rideshare.notify.js), so it is
   * also the signal that the thing that notification is *about* has moved -
   * the customer's tracking page, their request list, the agent's own job
   * list. Refetching those on the same event is what makes a status change
   * appear everywhere at once instead of only in the bell.
   */
  const handleEvent = useCallback(
    (name, payload) => {
      setLastEventAt(Date.now());
      if (name === "notification") {
        queryClient.invalidateQueries("notifications");
        queryClient.invalidateQueries("notifications-unread-count");
        queryClient.invalidateQueries("delivery-requests");
        queryClient.invalidateQueries("delivery-request");
        queryClient.invalidateQueries("my-rides");
        queryClient.invalidateQueries("delivery-jobs-mine");
        queryClient.invalidateQueries("ride-jobs-mine");
        queryClient.invalidateQueries("wallet");
        queryClient.invalidateQueries("wallet-transactions");
        queryClient.invalidateQueries("orders");
        queryClient.invalidateQueries("restaurant-orders");
        return;
      }
      if (name === "jobs") {
        const kind = payload?.kind;
        if (kind !== "ride") {
          queryClient.invalidateQueries("delivery-jobs-available");
          queryClient.invalidateQueries("delivery-jobs-available-count");
        }
        if (kind !== "delivery") {
          queryClient.invalidateQueries("ride-jobs-available");
          queryClient.invalidateQueries("ride-jobs-available-count");
        }
        // The back office watches the same boards from the other side.
        if (user?.role === "ADMIN") queryClient.invalidateQueries("admin-stats");
      }
    },
    [queryClient, user?.role]
  );

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined" || !("EventSource" in window)) {
      return undefined;
    }

    let closed = false;

    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const connect = () => {
      if (closed) return;
      const source = new EventSource("/api/realtime/stream", { withCredentials: true });
      sourceRef.current = source;

      source.addEventListener("ready", () => {
        setConnected(true);
        // A connection that lasted long enough to be greeted is a healthy
        // one, so the next failure starts its backoff from the bottom
        // again rather than from wherever the last outage ended.
        retryRef.current = RECONNECT_MIN_MS;
        // Anything that happened while this client was away was not
        // queued for it - the bus has no replay - so catch up once on
        // connect instead of waiting for the next change.
        queryClient.invalidateQueries("notifications-unread-count");
        queryClient.invalidateQueries("delivery-jobs-available-count");
        queryClient.invalidateQueries("ride-jobs-available-count");
      });

      for (const name of ["notification", "jobs"]) {
        source.addEventListener(name, (event) => {
          let payload = null;
          try {
            payload = JSON.parse(event.data);
          } catch {
            // A frame we can't parse still means *something* changed, so
            // fall through to the handler with no payload rather than
            // dropping it.
          }
          handleEvent(name, payload);
        });
      }

      source.onerror = () => {
        setConnected(false);
        // EventSource retries a dropped connection by itself (honouring the
        // server's `retry:` hint) and leaves readyState CONNECTING. It does
        // NOT retry when the response was an HTTP error - a 401 after a
        // session expires, or a 502 while the backend restarts - it closes
        // for good. Those are the cases this backoff exists for; without it
        // an expired session means no live updates until a page reload, and
        // a retry loop with no backoff means hammering a backend that is
        // already having a bad minute.
        if (source.readyState === EventSource.CLOSED && !closed) {
          source.close();
          clearRetry();
          retryTimerRef.current = setTimeout(connect, retryRef.current);
          retryRef.current = Math.min(retryRef.current * 2, RECONNECT_MAX_MS);
        }
      };
    };

    connect();

    // A tab that was hidden may have slept through its reconnect backoff,
    // and a phone that was locked certainly did. Coming back into view is
    // the one moment the user is definitely looking, so catch up then.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      queryClient.invalidateQueries("notifications-unread-count");
      queryClient.invalidateQueries("delivery-jobs-available-count");
      queryClient.invalidateQueries("ride-jobs-available-count");
      if (sourceRef.current?.readyState === EventSource.CLOSED) {
        clearRetry();
        retryRef.current = RECONNECT_MIN_MS;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      clearRetry();
      document.removeEventListener("visibilitychange", onVisible);
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
    };
    // Re-runs on sign-in and sign-out. handleEvent is stable per role, and
    // a role change needs a fresh connection anyway: the server decides
    // which role channel this connection hears at connect time.
  }, [isAuthenticated, user?.role, handleEvent, queryClient]);

  return (
    <LiveContext.Provider value={{ connected, lastEventAt }}>{children}</LiveContext.Provider>
  );
}
