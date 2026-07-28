import { z } from "zod";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getLeaderboard, getRankContext } from "../services/leaderboard.service.js";

export const leaderboardQuerySchema = z.object({
  period: z.enum(["all", "week", "month"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const getBoard = asyncHandler(async (req, res) => {
  const { period, limit } = req.validatedQuery || { period: "all", limit: 10 };

  const entries = await getLeaderboard({ period, limit });
  const currentUserId = req.user ? String(req.user._id) : null;

  return ok(res, {
    period,
    entries: entries.map((entry) => ({
      ...entry,
      isCurrentUser: entry.id === currentUserId,
    })),
  });
});

export const getMyRank = asyncHandler(async (req, res) => {
  return ok(res, await getRankContext(req.user));
});
