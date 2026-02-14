import pg from "pg";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";
import process from "process";

dotenv.config();

let db;
const { Pool } = pg;

export const getDBConnection = () => {
  if (!db) {
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      connectionTimeoutMillis: 5000,
      acquireTimeoutMillis: 6000,
      idleTimeoutMillis: 30000,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });

    db.query("SELECT NOW()", (err, res) => {
      if (err) {
        logger.error(
          `Database connection error: ${err.message || err.error || err}`,
        );
      } else {
        logger.info(
          `Database connected successfully at: ${res.rows[0].now}`,
        );
      }
    });

    db.on("error", (err) => {
      console.error("Unexpected database error:", err.message);
    });
  }

  return db;
};

export const closeDBConnection = async () => {
  if (db) {
    await db.end();
    logger.info("Database connection closed.");
    db = null;
  }
};