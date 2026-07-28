import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { env, isProduction } from "./config/env.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // `crossOriginResourcePolicy` is relaxed so the Next.js dev server can load
  // any assets this API might serve.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // CLIENT_URL may hold several comma-separated origins, so one deployment can
  // serve local development and the production frontend at the same time.
  const allowedOrigins = new Set(
    [...env.clientUrl.split(","), "http://localhost:3000", "http://127.0.0.1:3000"]
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );

  function isAllowedOrigin(origin) {
    if (allowedOrigins.has(origin)) return true;
    // Vercel gives every branch and commit its own preview hostname, which
    // cannot be enumerated ahead of time.
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  }

  app.use(
    cors({
      origin(origin, callback) {
        // No origin = curl / Postman / server-side fetch.
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        // Refuse by omitting the CORS headers rather than throwing: throwing
        // here turns a blocked preflight into an opaque 500.
        console.warn(`[cors] blocked origin: ${origin}`);
        return callback(null, false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());
  app.use(morgan(isProduction ? "combined" : "dev"));

  app.get("/", (req, res) => {
    res.json({
      success: true,
      data: {
        name: "EcoHabits API",
        version: "1.0.0",
        docs: "/api/health",
      },
    });
  });

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
