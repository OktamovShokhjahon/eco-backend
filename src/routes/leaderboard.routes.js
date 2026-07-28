import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getBoard,
  getMyRank,
  leaderboardQuerySchema,
} from "../controllers/leaderboard.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyRank);
router.get("/", optionalAuth, validate(leaderboardQuerySchema, "query"), getBoard);

export default router;
