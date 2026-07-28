import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getMe,
  updateMe,
  changePassword,
  getMyStats,
  updateProfileSchema,
  changePasswordSchema,
} from "../controllers/user.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMe);
router.patch("/me", validate(updateProfileSchema), updateMe);
router.patch("/me/password", validate(changePasswordSchema), changePassword);
router.get("/me/stats", getMyStats);

export default router;
