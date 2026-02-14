#!/usr/bin/env node

/**
 * Stripe Connection Checker
 * Verifies your Stripe integration is properly configured
 */

import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log("\n🔍 Checking Stripe Integration...\n");

async function checkStripeConnection() {
  const results = {
    apiKey: false,
    connection: false,
    webhookSecret: false,
    customers: 0,
    subscriptions: 0,
    invoices: 0,
  };

  // Check API Key
  console.log("1️⃣ Checking API Key...");
  if (process.env.STRIPE_SECRET_KEY) {
    if (process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
      console.log("   ✅ Test Mode API Key configured");
      results.apiKey = "test";
    } else if (process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      console.log("   ✅ Live Mode API Key configured");
      results.apiKey = "live";
    } else {
      console.log("   ❌ Invalid API Key format");
    }
  } else {
    console.log("   ❌ API Key not found in .env");
    return results;
  }

  // Check Stripe Connection
  console.log("\n2️⃣ Testing Stripe Connection...");
  try {
    const account = await stripe.accounts.retrieve();
    console.log(
      `   ✅ Connected to Stripe Account: ${account.business_profile?.name || account.email}`,
    );
    console.log(`   📧 Email: ${account.email}`);
    console.log(`   🌍 Country: ${account.country}`);
    console.log(`   💰 Currency: ${account.default_currency.toUpperCase()}`);
    results.connection = true;
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return results;
  }

  // Check Customers
  console.log("\n3️⃣ Checking Customers...");
  try {
    const customers = await stripe.customers.list({ limit: 100 });
    results.customers = customers.data.length;
    console.log(
      `   ✅ Found ${results.customers} customer(s) in your Stripe account`,
    );

    if (customers.data.length > 0) {
      console.log("   \n   Recent customers:");
      customers.data.slice(0, 3).forEach((customer, i) => {
        console.log(
          `   ${i + 1}. ${customer.name || customer.email} (${customer.id})`,
        );
      });
    } else {
      console.log("   ℹ️  No customers found. You can create them through:");
      console.log("      - Your PayFlow application");
      console.log(
        "      - Stripe Dashboard: https://dashboard.stripe.com/test/customers",
      );
    }
  } catch (error) {
    console.log(`   ⚠️  Could not fetch customers: ${error.message}`);
  }

  // Check Subscriptions
  console.log("\n4️⃣ Checking Subscriptions...");
  try {
    const subscriptions = await stripe.subscriptions.list({ limit: 100 });
    results.subscriptions = subscriptions.data.length;
    console.log(`   ✅ Found ${results.subscriptions} subscription(s)`);
  } catch (error) {
    console.log(`   ⚠️  Could not fetch subscriptions: ${error.message}`);
  }

  // Check Invoices
  console.log("\n5️⃣ Checking Invoices...");
  try {
    const invoices = await stripe.invoices.list({ limit: 100 });
    results.invoices = invoices.data.length;
    console.log(`   ✅ Found ${results.invoices} invoice(s)`);
  } catch (error) {
    console.log(`   ⚠️  Could not fetch invoices: ${error.message}`);
  }

  // Check Webhook Secret
  console.log("\n6️⃣ Checking Webhook Configuration...");
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    if (process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
      console.log("   ✅ Webhook secret configured");
      results.webhookSecret = true;
    } else {
      console.log("   ⚠️  Webhook secret format looks incorrect");
    }
  } else {
    console.log("   ⚠️  Webhook secret not configured (optional for testing)");
    console.log(
      "      Set up webhooks at: https://dashboard.stripe.com/test/webhooks",
    );
  }

  return results;
}

async function main() {
  try {
    const results = await checkStripeConnection();

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(
      `API Key:        ${results.apiKey === "test" ? "✅ TEST MODE" : results.apiKey === "live" ? "⚠️  LIVE MODE" : "❌ NOT SET"}`,
    );
    console.log(
      `Connection:     ${results.connection ? "✅ Connected" : "❌ Failed"}`,
    );
    console.log(`Customers:      ${results.customers} customer(s)`);
    console.log(`Subscriptions:  ${results.subscriptions} subscription(s)`);
    console.log(`Invoices:       ${results.invoices} invoice(s)`);
    console.log(
      `Webhooks:       ${results.webhookSecret ? "✅ Configured" : "⚠️  Not configured"}`,
    );
    console.log("=".repeat(60));

    if (results.connection) {
      console.log("\n✅ Your Stripe integration is working!");
      console.log("\n📖 Next steps:");
      console.log("   1. Start your application: npm run dev");
      console.log(
        "   2. View Stripe Dashboard: https://dashboard.stripe.com/test/dashboard",
      );
      console.log(
        "   3. Read integration guide: docs/STRIPE_INTEGRATION_GUIDE.md",
      );

      if (results.customers === 0) {
        console.log("\n💡 Tip: Create your first customer through:");
        console.log("   - PayFlow app → Customers → Add Customer");
        console.log("   - Stripe Dashboard → Customers → Add customer");
        console.log("   - Use test card: 4242 4242 4242 4242");
      }
    } else {
      console.log("\n❌ Stripe integration needs configuration");
      console.log("\n📖 Setup guide: docs/STRIPE_INTEGRATION_GUIDE.md");
    }

    console.log("\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   - .env file exists with STRIPE_SECRET_KEY");
    console.log("   - You have installed dependencies: npm install");
    console.log("   - Your Stripe API key is valid");
    process.exit(1);
  }
}

main();
