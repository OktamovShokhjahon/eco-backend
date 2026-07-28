import { z } from "zod";
import { User, TaskCompletion, Task, Order } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getUserRank } from "../services/leaderboard.service.js";
import { effectiveStreak } from "../services/streak.service.js";
import { todayKey } from "../utils/dates.js";

/**
 * The single user shape the frontend consumes everywhere (auth responses,
 * navbar, profile). Superset of the frontend's `User` interface: it keeps
 * `id/firstName/lastName/email/address/age/status/ecoPoints/rank/
 * completedTasks/avatar` and adds the gamification fields.
 */
export async function buildProfile(user) {
  const rank = await getUserRank(user);
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    address: user.address,
    age: user.age,
    status: user.status,
    avatar: user.avatar || "",
    ecoPoints: user.ecoPoints,
    totalPointsEarned: user.totalPointsEarned,
    completedTasks: user.completedTasks,
    co2Saved: Math.round(user.co2Saved * 10) / 10,
    currentStreak: effectiveStreak(user),
    longestStreak: user.longestStreak,
    rank,
    createdAt: user.createdAt,
  };
}

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  address: z.string().trim().min(1).max(120).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  status: z.enum(["student", "pupil"]).optional(),
  avatar: z.string().trim().max(300).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(128),
});

export const getMe = asyncHandler(async (req, res) => {
  return ok(res, { user: await buildProfile(req.user) });
});

export const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  return ok(res, { user: await buildProfile(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+passwordHash");
  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest("Your current password is incorrect");

  await user.setPassword(newPassword);
  await user.save();

  return ok(res, { message: "Password updated" });
});

export const getMyStats = asyncHandler(async (req, res) => {
  const user = req.user;
  const today = todayKey();

  const [rank, totalUsers, activeTasks, completedToday, orders] = await Promise.all([
    getUserRank(user),
    User.estimatedDocumentCount(),
    Task.countDocuments({ isActive: true }),
    TaskCompletion.countDocuments({ user: user._id, date: today }),
    Order.countDocuments({ user: user._id, status: "completed" }),
  ]);

  return ok(res, {
    ecoPoints: user.ecoPoints,
    totalPointsEarned: user.totalPointsEarned,
    completedTasks: user.completedTasks,
    co2Saved: Math.round(user.co2Saved * 10) / 10,
    // A tree absorbs roughly 21 kg of CO2 per year.
    treesEquivalent: Math.floor(user.co2Saved / 21),
    currentStreak: effectiveStreak(user),
    longestStreak: user.longestStreak,
    rank,
    totalUsers,
    todayCompleted: completedToday,
    todayTotal: activeTasks,
    ordersMade: orders,
  });
});
