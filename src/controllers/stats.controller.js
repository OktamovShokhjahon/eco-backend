import { User, Task, TaskCompletion, Product, Order } from "../models/index.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

/**
 * GET /api/stats - the four counters on the landing page, computed from real
 * data rather than hardcoded. Raw numbers are returned; the frontend formats
 * them ("10K+", "500 tons").
 */
export const getPlatformStats = asyncHandler(async (req, res) => {
  const [activeUsers, tasksCompleted, co2Aggregate, taskCount, productCount, orderCount] =
    await Promise.all([
      User.estimatedDocumentCount(),
      TaskCompletion.estimatedDocumentCount(),
      TaskCompletion.aggregate([
        { $group: { _id: null, total: { $sum: "$co2Saved" } } },
      ]),
      Task.countDocuments({ isActive: true }),
      Product.estimatedDocumentCount(),
      Order.estimatedDocumentCount(),
    ]);

  const co2Saved = Math.round((co2Aggregate[0]?.total || 0) * 10) / 10;

  return ok(res, {
    activeUsers,
    tasksCompleted,
    co2Saved, // kilograms
    // A mature tree absorbs roughly 21 kg of CO2 per year.
    treesPlanted: Math.floor(co2Saved / 21),
    availableTasks: taskCount,
    availableProducts: productCount,
    rewardsClaimed: orderCount,
  });
});
