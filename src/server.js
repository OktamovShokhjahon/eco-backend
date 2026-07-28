import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function start() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] EcoHabits API listening on http://localhost:${env.port}`);
    console.log(`[api] CORS origin: ${env.clientUrl}`);
    console.log(`[api] Health check: http://localhost:${env.port}/api/health`);
  });

  const shutdown = (signal) => {
    console.log(`\n[api] ${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[api] failed to start:", error.message);
  process.exit(1);
});
