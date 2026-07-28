import { z } from "zod";
import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ok, created } from "../utils/apiResponse.js";
import { signToken } from "../utils/token.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { buildProfile } from "./user.controller.js";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  address: z.string().trim().min(1, "Address is required").max(120),
  // The register form sends `age` from a number input, so it may arrive as a
  // string - coerce rather than reject.
  age: z.coerce.number().int("Age must be a whole number").min(1).max(120),
  status: z.enum(["student", "pupil"], {
    errorMap: () => ({ message: "Status must be either student or pupil" }),
  }),
  avatar: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const register = asyncHandler(async (req, res) => {
  const { password, ...rest } = req.body;

  const existing = await User.findOne({ email: rest.email });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const user = new User(rest);
  await user.setPassword(password);
  await user.save();

  return created(res, {
    token: signToken(user._id),
    user: await buildProfile(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  // Same message for both failure modes so the endpoint can't be used to
  // enumerate registered email addresses.
  if (!user) throw ApiError.unauthorized("Incorrect email or password");

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized("Incorrect email or password");

  return ok(res, {
    token: signToken(user._id),
    user: await buildProfile(user),
  });
});

export const me = asyncHandler(async (req, res) => {
  return ok(res, { user: await buildProfile(req.user) });
});
