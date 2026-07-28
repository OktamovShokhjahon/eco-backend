import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import taskRoutes from "./task.routes.js";
import productRoutes from "./product.routes.js";
import orderRoutes from "./order.routes.js";
import leaderboardRoutes from "./leaderboard.routes.js";
import { getPlatformStats } from "../controllers/stats.controller.js";
import { listAchievements } from "../controllers/achievement.controller.js";
import { optionalAuth } from "../middleware/auth.js";
import { dbStateLabel } from "../config/db.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      uptime: Math.round(process.uptime()),
      database: dbStateLabel(),
      dbName: mongoose.connection.name || null,
      timestamp: new Date().toISOString(),
    },
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.get("/stats", getPlatformStats);
router.get("/achievements", optionalAuth, listAchievements);

export default router;
