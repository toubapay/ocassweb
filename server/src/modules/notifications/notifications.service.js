const prisma = require("../../lib/prisma");

/**
 * Creates an in-app notification. Callers should not `await` this inline
 * in a request handler without a `.catch()` - a notification failing to
 * write should never fail the action that triggered it (a booking, a
 * cancellation, ...), so treat this as fire-and-forget from the caller's
 * side.
 */
async function notify({ userId, type, title, body, data }) {
  return prisma.notification.create({
    data: { userId, type, title, body, data: data ?? undefined },
  });
}

module.exports = { notify };
