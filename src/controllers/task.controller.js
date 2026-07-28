import { z } from "zod";
import {
  Task,
  TaskCompletion,
  TASK_CATEGORIES,
  TASK_DIFFICULTIES,
} from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ok, created } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { applyStreak, recomputeStreak, effectiveStreak } from "../services/streak.service.js";
import { evaluateAchievements } from "../services/achievement.service.js";
import { buildProfile } from "./user.controller.js";
import { todayKey } from "../utils/dates.js";

export const taskQuerySchema = z.object({
  category: z.enum(TASK_CATEGORIES).optional(),
  difficulty: z.enum(TASK_DIFFICULTIES).optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/tasks
 * Public, but personalised: when a token is present each task carries
 * `completed` = "this user already claimed it today". Tasks are daily habits,
 * so the flag resets at midnight.
 */
export const listTasks = asyncHandler(async (req, res) => {
  const { category, difficulty } = req.validatedQuery || {};

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;

  const tasks = await Task.find(filter).sort({ order: 1, createdAt: 1 });

  let completedIds = new Set();
  if (req.user) {
    const todays = await TaskCompletion.find({
      user: req.user._id,
      date: todayKey(),
    }).select("task");
    completedIds = new Set(todays.map((c) => String(c.task)));
  }

  return ok(
    res,
    tasks.map((task) => ({
      ...task.toJSON(),
      completed: completedIds.has(String(task._id)),
    }))
  );
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task || !task.isActive) throw ApiError.notFound("Task not found");

  let completed = false;
  if (req.user) {
    completed = Boolean(
      await TaskCompletion.exists({
        user: req.user._id,
        task: task._id,
        date: todayKey(),
      })
    );
  }

  return ok(res, { ...task.toJSON(), completed });
});

/**
 * POST /api/tasks/:id/complete
 * The unique index on { user, task, date } is what actually prevents
 * double-claiming - we let the insert fail rather than check-then-write, which
 * would race under concurrent clicks.
 */
export const completeTask = asyncHandler(async (req, res) => {
  const user = req.user;
  const day = todayKey();

  const task = await Task.findById(req.params.id);
  if (!task || !task.isActive) throw ApiError.notFound("Task not found");

  let completion;
  try {
    completion = await TaskCompletion.create({
      user: user._id,
      task: task._id,
      date: day,
      pointsAwarded: task.points,
      co2Saved: task.co2Impact,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict("You have already completed this task today");
    }
    throw error;
  }

  user.ecoPoints += task.points;
  user.totalPointsEarned += task.points;
  user.completedTasks += 1;
  user.co2Saved += task.co2Impact;
  applyStreak(user, day);
  await user.save();

  // Bonus points from any unlocked badge are applied to `user` and saved here.
  const newAchievements = await evaluateAchievements(user);

  return created(res, {
    task: { ...task.toJSON(), completed: true },
    completion: completion.toJSON(),
    pointsAwarded: task.points,
    co2Saved: task.co2Impact,
    currentStreak: effectiveStreak(user),
    newAchievements: newAchievements.map((a) => a.toJSON()),
    user: await buildProfile(user),
  });
});

/**
 * DELETE /api/tasks/:id/complete
 * Undoes today's completion and rolls the counters back. Badges already earned
 * are intentionally kept - unlocking one is a permanent milestone.
 */
export const uncompleteTask = asyncHandler(async (req, res) => {
  const user = req.user;
  const day = todayKey();

  const completion = await TaskCompletion.findOneAndDelete({
    user: user._id,
    task: req.params.id,
    date: day,
  });
  if (!completion) throw ApiError.notFound("You have not completed this task today");

  user.ecoPoints = Math.max(0, user.ecoPoints - completion.pointsAwarded);
  user.totalPointsEarned = Math.max(0, user.totalPointsEarned - completion.pointsAwarded);
  user.completedTasks = Math.max(0, user.completedTasks - 1);
  user.co2Saved = Math.max(0, user.co2Saved - completion.co2Saved);
  await recomputeStreak(user);
  await user.save();

  return ok(res, {
    pointsRemoved: completion.pointsAwarded,
    currentStreak: effectiveStreak(user),
    user: await buildProfile(user),
  });
});

/** GET /api/tasks/history - recent activity feed for the profile page. */
export const getHistory = asyncHandler(async (req, res) => {
  const { limit } = req.validatedQuery || { limit: 20 };

  const completions = await TaskCompletion.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("task", "key title category difficulty imageUrl points");

  return ok(
    res,
    completions
      // A task deleted after the fact would leave a dangling reference.
      .filter((c) => c.task)
      .map((c) => ({
        id: String(c._id),
        date: c.date,
        pointsAwarded: c.pointsAwarded,
        co2Saved: c.co2Saved,
        completedAt: c.createdAt,
        task: {
          id: String(c.task._id),
          key: c.task.key,
          title: c.task.title,
          category: c.task.category,
          difficulty: c.task.difficulty,
          imageUrl: c.task.imageUrl,
          points: c.task.points,
        },
      }))
  );
});
