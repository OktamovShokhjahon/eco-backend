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

  const allowedOrigins = new Set([
    env.clientUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        // No origin = curl / Postman / server-side fetch.
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
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
