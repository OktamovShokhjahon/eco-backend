import { Achievement } from "../models/Achievement.js";
import { UserAchievement } from "../models/UserAchievement.js";
import { TaskCompletion } from "../models/TaskCompletion.js";
import { Order } from "../models/Order.js";
import { Task } from "../models/Task.js";
import { effectiveStreak } from "./streak.service.js";

/**
 * Builds the counters every achievement criterion is measured against.
 * `counts` is cached per call so a single evaluation hits Mongo at most once
 * per criterion family.
 */
async function buildProgressContext(user) {
  const [ordersMade, categoryCounts] = await Promise.all([
    Order.countDocuments({ user: user._id, status: "completed" }),
    TaskCompletion.aggregate([
      { $match: { user: user._id } },
      {
        $lookup: {
          from: Task.collection.name,
          localField: "task",
          foreignField: "_id",
          as: "taskDoc",
        },
      },
      { $unwind: "$taskDoc" },
      { $group: { _id: "$taskDoc.category", count: { $sum: 1 } } },
    ]),
  ]);

  const byCategory = Object.fromEntries(categoryCounts.map((c) => [c._id, c.count]));

  return {
    tasks_completed: user.completedTasks || 0,
    points_earned: user.totalPointsEarned || 0,
    streak_days: Math.max(user.currentStreak || 0, effectiveStreak(user)),
    orders_made: ordersMade,
    byCategory,
  };
}

function progressFor(achievement, ctx) {
  const { type, category } = achievement.criteria;
  if (type === "category_tasks") return ctx.byCategory[category] || 0;
  return ctx[type] ?? 0;
}

/**
 * Awards every achievement whose threshold the user now meets.
 * Returns the newly unlocked achievements (empty array when nothing changed)
 * so the API can surface a celebratory toast.
 *
 * Bonus points are added to the user document in memory; the caller is
 * responsible for saving it.
 */
export async function evaluateAchievements(user, { save = true } = {}) {
  const [achievements, existing] = await Promise.all([
    Achievement.find().sort({ order: 1 }),
    UserAchievement.find({ user: user._id }).select("achievement"),
  ]);

  const unlockedIds = new Set(existing.map((ua) => String(ua.achievement)));
  const candidates = achievements.filter((a) => !unlockedIds.has(String(a._id)));
  if (candidates.length === 0) return [];

  const ctx = await buildProgressContext(user);
  const newlyUnlocked = [];

  for (const achievement of candidates) {
    if (progressFor(achievement, ctx) < achievement.criteria.threshold) continue;

    try {
      await UserAchievement.create({ user: user._id, achievement: achievement._id });
    } catch (error) {
      if (error.code === 11000) continue; // already awarded by a parallel request
      throw error;
    }

    newlyUnlocked.push(achievement);

    if (achievement.rewardPoints > 0) {
      user.ecoPoints += achievement.rewardPoints;
      user.totalPointsEarned += achievement.rewardPoints;
      ctx.points_earned = user.totalPointsEarned;
    }
  }

  if (newlyUnlocked.length > 0 && save) await user.save();
  return newlyUnlocked;
}

/** Full catalog annotated with this user's progress, for the profile page. */
export async function listAchievementsForUser(user) {
  const achievements = await Achievement.find().sort({ order: 1 });

  if (!user) {
    return achievements.map((a) => ({
      ...a.toJSON(),
      unlocked: false,
      unlockedAt: null,
      progress: 0,
    }));
  }

  const [ctx, unlocked] = await Promise.all([
    buildProgressContext(user),
    UserAchievement.find({ user: user._id }),
  ]);

  const unlockedMap = new Map(unlocked.map((ua) => [String(ua.achievement), ua.unlockedAt]));

  return achievements.map((a) => {
    const unlockedAt = unlockedMap.get(String(a._id)) || null;
    const current = progressFor(a, ctx);
    return {
      ...a.toJSON(),
      unlocked: Boolean(unlockedAt),
      unlockedAt,
      progress: Math.min(current, a.criteria.threshold),
    };
  });
}
