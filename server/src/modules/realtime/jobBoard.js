const { EVENTS, publishToRoles } = require("./realtime.bus");

/**
 * "The open-job board changed" - published to the people who watch a board
 * they don't own.
 *
 * The notification channel can't carry this. A notification is addressed to
 * one user, and a new delivery request is news for *every* agent who could
 * take it and for nobody in particular: the one person it is not news to is
 * the customer who just created it. So this is a role broadcast, and the
 * audience is the agents for that kind of job plus ADMIN, whose dispatch
 * lists show the same rows.
 *
 * `reason` exists so a client can tell the two directions apart - a job
 * appearing is worth a chime on the home badge, a job being taken is not -
 * even though both send the same client to the same refetch.
 */
const AUDIENCE = {
  delivery: ["DELIVERY_AGENT", "ADMIN"],
  ride: ["RIDER", "ADMIN"],
};

function publishJobBoardChange(kind, reason) {
  const roles = AUDIENCE[kind];
  if (!roles) return;
  publishToRoles(roles, EVENTS.JOBS, { kind, reason });
}

module.exports = { publishJobBoardChange };
