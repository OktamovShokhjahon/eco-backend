import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

/**
 * Atlas connection strings are often pasted without a database name
 * ("...mongodb.net/?retryWrites=true"), which silently drops everything into
 * a database called "test". Fall back to an explicit name in that case.
 */
function resolveDbName(uri) {
  try {
    const path = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://")).pathname;
    const name = path.replace(/^\//, "");
    return name || env.dbName;
  } catch {
    return env.dbName;
  }
}

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      dbName: resolveDbName(env.mongoUri),
    });
    console.log(`[db] connected -> ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("[db] connection failed:", error.message);
    console.error(
      "[db] Is MongoDB running? Check MONGO_URI in backend/.env (current: " + env.mongoUri + ")"
    );
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export function dbStateLabel() {
  return ["disconnected", "connected", "connecting", "disconnecting"][
    mongoose.connection.readyState
  ];
}
