/**
 * Validates and replaces `req[source]` with the parsed result, so controllers
 * only ever see clean, typed input. Zod errors are rendered as 422 by the
 * central error handler.
 */
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    // req.query is a getter in Express 5; assigning to a local field is safer.
    if (source === "query") req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
