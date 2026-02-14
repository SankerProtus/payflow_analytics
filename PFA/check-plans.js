#!/usr/bin/env node

/**
 * Subscription Plans Checker
 * Verifies subscription plans are loaded in database
 */

import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log("\n🔍 Checking Subscription Plans...\n");

async function checkPlans() {
  try {
    // Check if subscription_plans table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'subscription_plans'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log("❌ subscription_plans table does not exist");
      console.log("\n💡 Run: npm run migrate");
      return;
    }

    console.log("✅ subscription_plans table exists\n");

    // Get all plans
    const plans = await pool.query(`
      SELECT
        id,
        name,
        tier,
        amount,
        currency,
        billing_interval,
        trial_period_days,
        active
      FROM subscription_plans
      ORDER BY amount ASC
    `);

    if (plans.rowCount === 0) {
      console.log("⚠️  No plans found in database\n");
      console.log("💡 To load sample data, run:");
      console.log(
        "   psql -U postgres -d payflow_analytics -f src/db/sample_data.sql\n",
      );
      return;
    }

    console.log(`📊 Found ${plans.rowCount} plan(s):\n`);

    plans.rows.forEach((plan, i) => {
      const price = (plan.amount / 100).toFixed(2);
      const status = plan.active ? "✅ Active" : "❌ Inactive";
      console.log(`${i + 1}. ${plan.name}`);
      console.log(`   Tier: ${plan.tier}`);
      console.log(
        `   Price: $${price} ${plan.currency}/${plan.billing_interval}`,
      );
      console.log(`   Trial: ${plan.trial_period_days} days`);
      console.log(`   Status: ${status}`);
      console.log(`   ID: ${plan.id}`);
      console.log("");
    });

    // Check active plans
    const activePlans = plans.rows.filter((p) => p.active);
    console.log(
      `✅ ${activePlans.length} active plan(s) available for subscription`,
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   - Database is running");
    console.log("   - DATABASE_URL is set in .env");
    console.log("   - Migrations have been run");
  } finally {
    await pool.end();
  }
}

checkPlans();
