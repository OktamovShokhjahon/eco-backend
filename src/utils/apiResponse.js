/**
 * Every successful response uses the same envelope so the frontend client can
 * unwrap it in one place: { success: true, data: ... }
 */
export function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function created(res, data) {
  return ok(res, data, 201);
}
