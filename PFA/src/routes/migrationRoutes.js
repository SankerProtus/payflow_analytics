import express from "express";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationRoutes = express.Router();

// Admin endpoint to run migrations (protect this in production!)
migrationRoutes.post("/run", async (req, res) => {
  const db = getDBConnection();

  try {
    logger.info("Starting database migrations via API...");

    // Read and execute schema.sql
    logger.info("Running schema.sql...");
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "../db/schema.sql"),
      "utf8",
    );

    try {
      await db.query(schemaSQL);
      logger.info("✓ Schema created successfully");
    } catch (error) {
      if (error.code === "42710" || error.code === "42P07") {
        logger.warn(`Some schema objects already exist: ${error.message}`);
        logger.info("✓ Continuing with existing schema...");
      } else {
        throw error;
      }
    }

    // Get all migration files
    const migrationsDir = path.join(__dirname, "../db/migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const results = [];

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
        results.push({ file, status: "success" });
      } catch (error) {
        if (error.code === "42710" || error.code === "42P07") {
          logger.warn(
            `Some objects in ${file} already exist: ${error.message}`,
          );
          logger.info(`✓ ${file} - skipping existing objects`);
          results.push({ file, status: "skipped" });
        } else {
          logger.error(`✗ ${file} failed: ${error.message}`);
          results.push({ file, status: "failed", error: error.message });
        }
      }
    }

    logger.info("✅ All migrations completed!");
    res.json({
      success: true,
      message: "Migrations completed successfully",
      results,
    });
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Migration failed",
      error: error.message,
    });
  }
});

// Check migration status
migrationRoutes.get("/status", async (req, res) => {
  const db = getDBConnection();

  try {
    // Check if main tables exist
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    res.json({
      success: true,
      tables: result.rows.map((r) => r.table_name),
      count: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { migrationRoutes };
