import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // Snapshot so purchase history stays truthful even if the product is later
    // renamed, repriced or removed.
    productSnapshot: {
      name: { type: String, required: true },
      imageUrl: { type: String, default: "" },
      category: { type: String, default: "" },
    },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    pricePaid: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["completed", "refunded"],
      default: "completed",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
