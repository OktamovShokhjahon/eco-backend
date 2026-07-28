import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
    },
    passwordHash: { type: String, required: true, select: false },
    address: { type: String, required: true, trim: true, maxlength: 120 },
    age: { type: Number, required: true, min: 1, max: 120 },
    status: { type: String, required: true, enum: ["student", "pupil"] },
    avatar: { type: String, default: "" },

    // `ecoPoints` is the spendable balance shown in the store.
    ecoPoints: { type: Number, default: 0, min: 0 },
    // `totalPointsEarned` is lifetime and drives the leaderboard, so spending
    // coins in the store never costs a user their rank.
    totalPointsEarned: { type: Number, default: 0, min: 0 },

    completedTasks: { type: Number, default: 0, min: 0 },
    co2Saved: { type: Number, default: 0, min: 0 }, // kilograms

    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastCompletionDate: { type: String, default: null }, // "YYYY-MM-DD"

    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Leaderboard reads are the hottest query in the app.
userSchema.index({ totalPointsEarned: -1, createdAt: 1 });

// The frontend's LeaderboardUser type wants a single flat `name`.
userSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.methods.setPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 10);
};

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
