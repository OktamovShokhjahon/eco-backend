import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { extractToken, verifyToken } from "../utils/token.js";
import { asyncHandler } from "./asyncHandler.js";

/** Rejects the request when there is no valid bearer token. */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized("Please sign in to continue");

  const payload = verifyToken(token); // throws -> handled centrally as 401
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("This account no longer exists");

  req.user = user;
  next();
});

/**
 * Attaches `req.user` when a valid token is present but never blocks the
 * request. Used by endpoints that are public yet personalised - e.g. the task
 * list marks which tasks *you* already completed today.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    req.user = await User.findById(payload.sub);
  } catch {
    req.user = null; // an expired token simply means "anonymous" here
  }
  next();
});
