import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
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
