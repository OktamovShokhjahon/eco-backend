/**
 * Task completions are keyed by calendar day so a task can be claimed once
 * per day. We store the day as a plain "YYYY-MM-DD" string, which keeps the
 * unique index simple and avoids timezone drift inside Mongo.
 */

export function toDayKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return toDayKey(new Date());
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function dayKeyOffset(days) {
  return toDayKey(addDays(new Date(), days));
}

/** Whole days between two "YYYY-MM-DD" keys (b - a). */
export function daysBetween(aKey, bKey) {
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

/** Start of the period used by the leaderboard filters. */
export function periodStartDate(period) {
  const now = new Date();
  if (period === "week") return addDays(now, -7);
  if (period === "month") return addDays(now, -30);
  return null;
}
