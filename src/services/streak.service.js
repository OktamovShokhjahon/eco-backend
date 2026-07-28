import { TaskCompletion } from "../models/TaskCompletion.js";
import { daysBetween, todayKey } from "../utils/dates.js";

/**
 * Advances a user's daily streak for a completion happening on `day`.
 * Mutates the user document in memory; the caller saves it.
 *
 *  - same day as the last completion  -> streak unchanged
 *  - exactly one day later            -> streak + 1
 *  - a longer gap (or first ever)     -> streak resets to 1
 */
export function applyStreak(user, day = todayKey()) {
  const last = user.lastCompletionDate;

  if (!last) {
    user.currentStreak = 1;
  } else {
    const gap = daysBetween(last, day);
    if (gap === 0) {
      user.currentStreak = Math.max(user.currentStreak, 1);
    } else if (gap === 1) {
      user.currentStreak += 1;
    } else if (gap > 1) {
      user.currentStreak = 1;
    }
    // gap < 0 means a back-dated entry; leave the streak alone.
  }

  user.lastCompletionDate = last && daysBetween(last, day) < 0 ? last : day;
  user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
  return user.currentStreak;
}

/**
 * Rebuilds the streak from the completion history. Used after an undo, where
 * the incremental rule above cannot know whether the removed completion was
 * the only one on its day.
 */
export async function recomputeStreak(user) {
  const days = await TaskCompletion.distinct("date", { user: user._id });

  if (days.length === 0) {
    user.currentStreak = 0;
    user.lastCompletionDate = null;
    return 0;
  }

  days.sort().reverse(); // newest first
  let streak = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (daysBetween(days[i], days[i - 1]) !== 1) break;
    streak += 1;
  }

  user.currentStreak = streak;
  user.lastCompletionDate = days[0];
  user.longestStreak = Math.max(user.longestStreak || 0, streak);
  return streak;
}

/**
 * A streak is only "live" if the user acted today or yesterday. Displayed
 * streaks are computed through this so a stale counter never lingers in the UI.
 */
export function effectiveStreak(user) {
  if (!user.lastCompletionDate) return 0;
  const gap = daysBetween(user.lastCompletionDate, todayKey());
  return gap <= 1 ? user.currentStreak : 0;
}
