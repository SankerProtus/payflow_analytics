/**
 * Create Stripe Products and Prices
 * This script creates real Stripe products/prices and updates the database
 * Run with: node src/db/create-stripe-products.js
 */

import Stripe from "stripe";
import { getDBConnection } from "./connection.js";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getDBConnection();

const PLANS = [
  {
    name: "Basic Plan",
    description: "Perfect for individuals and small teams getting started",
    tier: "starter",
    monthlyAmount: 900, // $9.00
    yearlyAmount: 8640, // $86.40 (20% discount)
    features: [
      "Up to 100 customers",
      "Basic analytics",
      "Email support",
      "1 user",
    ],
    trialDays: 14,
  },
  {
    name: "Pro Plan",
    description: "Advanced features for growing businesses",
    tier: "professional",
    monthlyAmount: 2900, // $29.00
    yearlyAmount: 27840, // $278.40 (20% discount)
    features: [
      "Up to 1,000 customers",
      "Advanced analytics",
      "Priority support",
      "Up to 5 users",
      "API access",
    ],
    trialDays: 14,
  },
  {
    name: "Enterprise Plan",
    description: "Complete solution for large organizations",
    tier: "enterprise",
    monthlyAmount: 9900, // $99.00
    yearlyAmount: 89100, // $891.00 (25% discount)
    features: [
      "Unlimited customers",
      "Custom analytics",
      "Dedicated support",
      "Unlimited users",
      "API access",
      "White-label options",
    ],
    trialDays: 30,
  },
];

async function createStripeProductsAndPrices() {
  console.log("🚀 Starting Stripe product and price creation...\n");

  try {
    // Check if plans already exist in database
    const existingPlans = await db.query(
      "SELECT COUNT(*) as count FROM subscription_plans WHERE active = true",
    );

    if (existingPlans.rows[0].count > 0) {
      console.log(
        `✅ Found ${existingPlans.rows[0].count} existing plan(s) in database`,
      );
      console.log("ℹ️  Skipping Stripe product creation to avoid duplicates\n");

      const result = await db.query(
        "SELECT name, stripe_price_id, amount, billing_interval, tier FROM subscription_plans WHERE active = true ORDER BY amount",
      );
      console.log("📋 Current plans:");
      console.table(
        result.rows.map((r) => ({
          Plan: r.name,
          Price: `$${r.amount / 100}`,
          Interval: r.billing_interval,
          Tier: r.tier,
          "Stripe Price ID": r.stripe_price_id,
        })),
      );
      return; // Exit early if plans already exist
    }

    console.log("ℹ️  No existing plans found. Creating new products...\n");

    for (const plan of PLANS) {
      console.log(`Creating product: ${plan.name}`);

      // Create Stripe Product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          tier: plan.tier,
        },
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create Monthly Price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: plan.monthlyAmount,
        recurring: {
          interval: "month",
          interval_count: 1,
          trial_period_days: plan.trialDays,
        },
        metadata: {
          tier: plan.tier,
          interval: "monthly",
        },
      });

      console.log(
        `✅ Monthly price created: ${monthlyPrice.id} ($${plan.monthlyAmount / 100}/mo)`,
      );

      // Create Yearly Price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: plan.yearlyAmount,
        recurring: {
          interval: "year",
          interval_count: 1,
          trial_period_days: plan.trialDays,
        },
        metadata: {
          tier: plan.tier,
          interval: "yearly",
        },
      });

      console.log(
        `✅ Yearly price created: ${yearlyPrice.id} ($${plan.yearlyAmount / 100}/yr)`,
      );

      // Update or insert into database - Monthly
      await db.query(
        `INSERT INTO subscription_plans (
          stripe_price_id, stripe_product_id, name, description, tier,
          amount, currency, billing_interval, trial_period_days,
          features, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (stripe_price_id)
        DO UPDATE SET
          stripe_product_id = EXCLUDED.stripe_product_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          features = EXCLUDED.features,
          updated_at = NOW()`,
        [
          monthlyPrice.id,
          product.id,
          `${plan.name} - Monthly`,
          plan.description,
          plan.tier,
          plan.monthlyAmount,
          "usd",
          "month",
          plan.trialDays,
          JSON.stringify(plan.features),
          true,
        ],
      );

      console.log(`✅ Monthly plan saved to database`);

      // Update or insert into database - Yearly
      await db.query(
        `INSERT INTO subscription_plans (
          stripe_price_id, stripe_product_id, name, description, tier,
          amount, currency, billing_interval, trial_period_days,
          features, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (stripe_price_id)
        DO UPDATE SET
          stripe_product_id = EXCLUDED.stripe_product_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          features = EXCLUDED.features,
          updated_at = NOW()`,
        [
          yearlyPrice.id,
          product.id,
          `${plan.name} - Yearly`,
          plan.description,
          plan.tier,
          plan.yearlyAmount,
          "usd",
          "year",
          plan.trialDays,
          JSON.stringify(plan.features),
          true,
        ],
      );

      console.log(`✅ Yearly plan saved to database\n`);
    }

    console.log("\n🎉 All products and prices created successfully!\n");
    console.log("📋 Summary:");

    const result = await db.query(
      "SELECT name, stripe_price_id, amount, billing_interval, tier FROM subscription_plans WHERE active = true ORDER BY amount",
    );
    console.table(
      result.rows.map((r) => ({
        Plan: r.name,
        Price: `$${r.amount / 100}`,
        Interval: r.billing_interval,
        Tier: r.tier,
        "Stripe Price ID": r.stripe_price_id,
      })),
    );

    console.log("\nℹ️  You can view these products in your Stripe Dashboard:");
    console.log("   https://dashboard.stripe.com/test/products\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.type === "StripeAuthenticationError") {
      console.error(
        "\n⚠️  Authentication failed. Please check your STRIPE_SECRET_KEY in .env",
      );
    }
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  } finally {
    try {
      await db.end();
      console.log("✅ Database connection closed\n");
    } catch (err) {
      console.warn("⚠️  Warning: Could not close database connection:", err.message);
    }
  }
}

createStripeProductsAndPrices();
