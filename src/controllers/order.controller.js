import { z } from "zod";
import mongoose from "mongoose";
import { Order, Product, User, priceAfterDiscount } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ok, created } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { evaluateAchievements } from "../services/achievement.service.js";
import { buildProfile } from "./user.controller.js";

export const createOrderSchema = z.object({
  productId: z
    .string()
    .refine((value) => mongoose.isValidObjectId(value), "Invalid product id"),
});

export const listOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * POST /api/orders - spend eco-points on a store product.
 *
 * The local MongoDB runs as a standalone server, so multi-document
 * transactions are unavailable. Instead the purchase is built from two
 * conditional atomic updates plus a compensating rollback:
 *
 *   1. reserve stock   - only succeeds while stock > 0
 *   2. charge the user - only succeeds while the balance covers the price
 *   3. if step 2 fails, the reserved unit is returned to stock
 *
 * Neither step can be "half applied", so a user can never be charged for an
 * item that was sold out, nor receive an item they could not afford.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");

  const price = priceAfterDiscount(product);

  // 1. Reserve one unit.
  const reserved = await Product.findOneAndUpdate(
    { _id: product._id, stock: { $gt: 0 } },
    { $inc: { stock: -1 } },
    { new: true }
  );
  if (!reserved) throw ApiError.conflict("This product is out of stock");

  // 2. Charge the balance.
  const charged = await User.findOneAndUpdate(
    { _id: req.user._id, ecoPoints: { $gte: price } },
    { $inc: { ecoPoints: -price } },
    { new: true }
  );

  if (!charged) {
    // 3. Compensate - hand the reserved unit back.
    await Product.updateOne({ _id: product._id }, { $inc: { stock: 1 } });
    throw ApiError.badRequest(
      `You need ${price - req.user.ecoPoints} more coins to buy this item`
    );
  }

  const order = await Order.create({
    user: charged._id,
    product: product._id,
    productSnapshot: {
      name: product.name,
      imageUrl: product.imageUrl,
      category: product.category,
    },
    unitPrice: product.price,
    discount: product.discount || 0,
    pricePaid: price,
  });

  const newAchievements = await evaluateAchievements(charged);

  return created(res, {
    order: order.toJSON(),
    product: reserved.toJSON(),
    pricePaid: price,
    newAchievements: newAchievements.map((a) => a.toJSON()),
    user: await buildProfile(charged),
  });
});

/** GET /api/orders - the signed-in user's purchase history. */
export const listMyOrders = asyncHandler(async (req, res) => {
  const { limit } = req.validatedQuery || { limit: 50 };

  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  const totalSpent = orders.reduce((sum, order) => sum + order.pricePaid, 0);

  return ok(res, {
    orders: orders.map((o) => o.toJSON()),
    totalSpent,
    count: orders.length,
  });
});
