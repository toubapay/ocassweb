const prisma = require("../../lib/prisma");
const { EVENTS, publishToUser } = require("../realtime/realtime.bus");

/**
 * Creates an in-app notification. Callers should not `await` this inline
 * in a request handler without a `.catch()` - a notification failing to
 * write should never fail the action that triggered it (a booking, a
 * cancellation, ...), so treat this as fire-and-forget from the caller's
 * side.
 *
 * This is also where the live channel is fed. Every module that writes to
 * an inbox goes through here, so publishing from this one function is what
 * makes "the bell updates itself" true of delivery, rideshare, Anando and
 * anything added later, without each of them having to remember. The event
 * is published only after the row is committed, so a client that refetches
 * the instant it arrives cannot read an inbox that doesn't contain it yet.
 */
async function notify({ userId, type, title, body, data }) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data: data ?? undefined },
  });
  // The payload says what changed, never the contents: clients refetch
  // through the authenticated endpoints, so the stream never becomes a
  // second path to the data itself.
  publishToUser(userId, EVENTS.NOTIFICATION, {
    id: notification.id,
    type: notification.type,
    role: data?.role ?? null,
  });
  return notification;
}

module.exports = { notify };
