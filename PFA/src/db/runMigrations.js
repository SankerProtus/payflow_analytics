import { getDBConnection } from "./connection.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const db = getDBConnection();

  try {
    logger.info("Starting database migrations...");

    // Read and execute schema.sql
    logger.info("Running schema.sql...");
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "schema.sql"),
      "utf8",
    );

    try {
      await db.query(schemaSQL);
      logger.info("✓ Schema created successfully");
    } catch (error) {
      // If error is due to already existing types/objects, continue
      if (error.code === "42710" || error.code === "42P07") {
        logger.warn(`Some schema objects already exist: ${error.message}`);
        logger.info("✓ Continuing with existing schema...");
      } else {
        throw error;
      }
    }

    // Get all migration files
    const migrationsDir = path.join(__dirname, "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // Run each migration
    for (const file of migrationFiles) {
      logger.info(`Running migration: ${file}...`);
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        "utf8",
      );

      try {
        await db.query(migrationSQL);
        logger.info(`✓ ${file} completed successfully`);
      } catch (error) {
        // If error is due to already existing objects, continue
        if (error.code === "42710" || error.code === "42P07") {
          logger.warn(
            `Some objects in ${file} already exist: ${error.message}`,
          );
          logger.info(`✓ ${file} - skipping existing objects`);
        } else {
          throw error;
        }
      }
    }

    logger.info("✅ All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();
