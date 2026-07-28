import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createOrder,
  listMyOrders,
  createOrderSchema,
  listOrdersQuerySchema,
} from "../controllers/order.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createOrderSchema), createOrder);
router.get("/", validate(listOrdersQuerySchema, "query"), listMyOrders);

export default router;
