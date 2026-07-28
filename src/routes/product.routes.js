import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  listProducts,
  getProduct,
  productQuerySchema,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", validate(productQuerySchema, "query"), listProducts);
router.get("/:id", getProduct);

export default router;
