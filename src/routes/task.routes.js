import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listTasks,
  getTask,
  completeTask,
  uncompleteTask,
  getHistory,
  taskQuerySchema,
  historyQuerySchema,
} from "../controllers/task.controller.js";

const router = Router();

// Declared before "/:id" so "history" is not parsed as an id.
router.get("/history", requireAuth, validate(historyQuerySchema, "query"), getHistory);

router.get("/", optionalAuth, validate(taskQuerySchema, "query"), listTasks);
router.get("/:id", optionalAuth, getTask);

router.post("/:id/complete", requireAuth, completeTask);
router.delete("/:id/complete", requireAuth, uncompleteTask);

export default router;
