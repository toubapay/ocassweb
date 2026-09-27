/**
 * Pure schedule logic for FlashSale campaigns - no DB/network access, so
 * it's easy to reason about and test in isolation from the controller
 * that calls it. Times are "HH:mm" strings interpreted on the server's
 * UTC clock, which doubles as Africa/Dakar wall-clock time since Senegal
 * is UTC+0 year-round (no DST) - see the FlashSale model comment.
 */

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Today's [start, end) window for `sale`, as real Date objects in UTC. */
function getFlashSaleWindow(sale, now = new Date()) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(dayStart.getTime() + timeToMinutes(sale.startTime) * 60000);
  const end = new Date(dayStart.getTime() + timeToMinutes(sale.endTime) * 60000);
  return { start, end };
}

/**
 * Whether `sale` is live right now: its admin toggle is on, today matches
 * its recurrence (always true for DAILY), and `now` falls inside today's
 * time-of-day window.
 */
function isFlashSaleLive(sale, now = new Date()) {
  if (!sale.isActive) return false;
  if (sale.recurrenceType === "WEEKLY" && now.getUTCDay() !== sale.dayOfWeek) return false;
  if (sale.recurrenceType === "MONTHLY" && now.getUTCDate() !== sale.dayOfMonth) return false;
  const { start, end } = getFlashSaleWindow(sale, now);
  return now >= start && now < end;
}

module.exports = { isFlashSaleLive, getFlashSaleWindow };
