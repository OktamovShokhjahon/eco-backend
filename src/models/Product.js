import mongoose from "mongoose";

export const PRODUCT_CATEGORIES = ["electronics", "home", "outdoor", "accessories"];

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // Price is denominated in eco-points ("coins"), not currency.
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: PRODUCT_CATEGORIES },
    imageUrl: { type: String, default: "" },
    stock: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 90 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        // The store UI reads `inStock` and treats `discount` as optional.
        if (!ret.discount) delete ret.discount;
        return ret;
      },
    },
  }
);

productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

productSchema.virtual("finalPrice").get(function () {
  return Math.floor(this.price * (1 - (this.discount || 0) / 100));
});

export const Product = mongoose.model("Product", productSchema);

/** Price actually charged, matching the frontend's display arithmetic. */
export function priceAfterDiscount(product) {
  return Math.floor(product.price * (1 - (product.discount || 0) / 100));
}
