import { z } from "zod";
import { Product, PRODUCT_CATEGORIES } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const productQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
});

export const listProducts = asyncHandler(async (req, res) => {
  const { category, sort } = req.validatedQuery || {};

  const filter = {};
  if (category) filter.category = category;

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
  };

  const products = await Product.find(filter).sort(sortMap[sort] || { createdAt: 1 });
  return ok(res, products.map((p) => p.toJSON()));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");
  return ok(res, product.toJSON());
});
