import mongoose from "mongoose";

export const ACHIEVEMENT_CRITERIA = [
  "tasks_completed", // lifetime task completions
  "points_earned", // lifetime points
  "streak_days", // consecutive active days
  "orders_made", // store purchases
  "category_tasks", // completions within one task category
];

const achievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: "Award" }, // lucide-react icon name
    tier: { type: String, enum: ["bronze", "silver", "gold"], default: "bronze" },
    criteria: {
      type: { type: String, required: true, enum: ACHIEVEMENT_CRITERIA },
      threshold: { type: Number, required: true, min: 1 },
      category: { type: String, default: null }, // only for category_tasks
    },
    // Bonus points granted the moment the badge unlocks.
    rewardPoints: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
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

achievementSchema.index({ order: 1 });

export const Achievement = mongoose.model("Achievement", achievementSchema);
