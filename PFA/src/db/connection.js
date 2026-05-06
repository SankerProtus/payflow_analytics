import pg from "pg";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";
import process from "process";

dotenv.config();

let db;
const { Pool } = pg;

const buildPoolConfig = () => {
  const baseConfig = {
    max: 20,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 6000,
    idleTimeoutMillis: 30000,
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  if (process.env.PG_HOST) {
    return {
      ...baseConfig,
      host: process.env.PG_HOST,
      user: process.env.PG_USER,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT ? Number(process.env.PG_PORT) : undefined,
      ssl:
        process.env.PG_SSL === "true" || process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  return null;
};

export const getDBConnection = () => {
  if (!db) {
    const poolConfig = buildPoolConfig();

    if (!poolConfig) {
      logger.error(
        "Database configuration missing. Set DATABASE_URL or PG_HOST/PG_USER/PG_DATABASE/PG_PASSWORD/PG_PORT.",
      );
      throw new Error("Database configuration is missing.");
    }

    db = new Pool(poolConfig);

    db.query("SELECT NOW()", (err, res) => {
      if (err) {
        logger.error(
          `Database connection error: ${err.message || err.error || err}`,
        );
      } else {
        logger.info(`Database connected successfully at: ${res.rows[0].now}`);
      }
    });

    db.on("error", (err) => {
      logger.error("Unexpected database error:", err.message);
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
