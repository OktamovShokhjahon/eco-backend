import mongoose from "mongoose";

const taskCompletionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    // Calendar day, "YYYY-MM-DD". Tasks are daily habits: the same task can be
    // completed again tomorrow, but only once today.
    date: { type: String, required: true },
    pointsAwarded: { type: Number, required: true, min: 0 },
    co2Saved: { type: Number, default: 0, min: 0 },
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

// The heart of the "one claim per task per day" rule - enforced by the
// database, not by a read-then-write race in the controller.
taskCompletionSchema.index({ user: 1, task: 1, date: 1 }, { unique: true });
taskCompletionSchema.index({ user: 1, createdAt: -1 });
taskCompletionSchema.index({ createdAt: -1 });

export const TaskCompletion = mongoose.model("TaskCompletion", taskCompletionSchema);
