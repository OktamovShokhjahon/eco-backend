import mongoose from "mongoose";

export const TASK_CATEGORIES = ["energy", "waste", "water", "transport", "food"];
export const TASK_DIFFICULTIES = ["easy", "medium", "hard"];

const taskSchema = new mongoose.Schema(
  {
    // Stable identifier ("task1".."task6") the frontend uses to look up its
    // own EN/RU/UZ translation. `title`/`description` below are the English
    // fallback for anything the translation file does not cover.
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, enum: TASK_CATEGORIES },
    difficulty: { type: String, required: true, enum: TASK_DIFFICULTIES },
    imageUrl: { type: String, default: "" },
    // Estimated kilograms of CO2 avoided per completion - feeds the global
    // "CO2 saved" and "trees planted" counters on the landing page.
    co2Impact: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
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

taskSchema.index({ isActive: 1, order: 1 });

export const Task = mongoose.model("Task", taskSchema);
