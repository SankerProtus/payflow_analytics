/**
 * Stripe Singleton Instance
 *
 * CRITICAL: loadStripe MUST be called once at module level, not inside components.
 * This ensures the Stripe instance is created once and shared across the entire app.
 *
 * Violating this causes Elements to unmount/remount, leading to:
 * "IntegrationError: We could not retrieve data from the specified Element"
 */

import { loadStripe } from "@stripe/stripe-js";

// Singleton - created once when module loads
// This promise is memoized by Stripe internally
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);

/**
 * Why this works:
 *
 * 1. Module is loaded ONCE by JavaScript runtime
 * 2. stripePromise is created ONCE during module initialization
 * 3. All imports of this module get the SAME promise instance
 * 4. Stripe.js internally memoizes the loadStripe result
 * 5. Elements provider can safely mount/unmount without recreating Stripe
 *
 * Why component-level loadStripe breaks:
 *
 * 1. Component file is reevaluated on hot reload
 * 2. Conditional rendering can cause module re-import
 * 3. Creates race conditions with Elements initialization
 * 4. CardElement loses reference to Stripe instance
 */
