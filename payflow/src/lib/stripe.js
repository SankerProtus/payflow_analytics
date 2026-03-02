import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error(
    "❌ STRIPE CONFIGURATION ERROR:\n" +
      "VITE_STRIPE_PUBLISHABLE_KEY is not defined in environment variables.\n\n" +
      "To fix:\n" +
      "1. Create a .env file in the payflow/ directory\n" +
      "2. Add: VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here\n" +
      "3. Restart your dev server (npm run dev)\n\n" +
      "Get your key from: https://dashboard.stripe.com/test/apikeys",
  );
}

export const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.reject(new Error("Stripe publishable key is not configured"));
