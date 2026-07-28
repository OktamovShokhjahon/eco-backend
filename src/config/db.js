import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

/** The database named in the connection string, or "" when it omits one. */
function dbNameFromUri(uri) {
  try {
    const path = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://")).pathname;
    return path.replace(/^\//, "");
  } catch {
    return "";
  }
}

export async function connectDB() {
  try {
    const uriDbName = dbNameFromUri(env.mongoUri);

    // Atlas connection strings are often pasted without a database name
    // ("...mongodb.net/?retryWrites=true"), so everything lands in a database
    // called "test". Warn about it, but do NOT reroute automatically - an
    // existing deployment's data lives wherever it already is.
    if (!uriDbName && !env.dbName) {
      console.warn(
        '[db] MONGO_URI has no database name, so MongoDB will use "test". ' +
          "Add one to the URI path, or set MONGO_DB_NAME, once you know which " +
          "database your data is in."
      );
    }

    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      // Only override when explicitly asked to.
      ...(env.dbName ? { dbName: env.dbName } : {}),
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
