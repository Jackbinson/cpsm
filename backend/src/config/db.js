import mongoose from "mongoose";
import { logger } from "../services/structuredLogger.js";

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on("error", (error) => logger.error("mongodb.connection_error", { error }));
  mongoose.connection.on("disconnected", () => logger.warn("mongodb.disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("mongodb.reconnected"));
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    const error = new Error("Missing MONGO_URI or MONGODB_URI in environment");
    logger.error("mongodb.configuration_error", { error });
    throw error;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    attachConnectionListeners();
    logger.info("mongodb.connected", {
      host: conn.connection.host,
      database: conn.connection.name,
    });
    return conn;
  } catch (error) {
    logger.error("mongodb.connection_failed", { error });
    throw error;
  }
};

export default connectDB;
