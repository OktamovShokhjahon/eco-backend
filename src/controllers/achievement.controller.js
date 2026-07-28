import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { listAchievementsForUser } from "../services/achievement.service.js";

/**
 * GET /api/achievements
 * Public catalog; when signed in every badge is annotated with `unlocked`,
 * `unlockedAt` and the user's progress toward its threshold.
 */
export const listAchievements = asyncHandler(async (req, res) => {
  const achievements = await listAchievementsForUser(req.user || null);

  return ok(res, {
    achievements,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
    total: achievements.length,
  });
});
