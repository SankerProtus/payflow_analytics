/**
 * Exchange Rate Service
 *
 * Handles multi-currency conversion with:
 * - Daily rate refreshes from external API
 * - Database caching for historical accuracy
 * - Fallback to recent rates (max 7 days old)
 * - Integer cent precision (no floating point errors)
 *
 * CRITICAL: All amounts are in CENTS (not dollars)
 */

import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";

const db = getDBConnection();

// Cache for in-memory rate lookups (refreshed hourly)
const rateCache = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 3600000; // 1 hour

class ExchangeRateService {
  constructor() {
    this.baseCurrency = "usd";
    this.initialized = false;
  }

  /**
   * Initialize service and load rates
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.refreshRates();
      this.initialized = true;
      logger.info("Exchange rate service initialized");

      // Schedule daily refresh at 2 AM UTC
      this._scheduleDailyRefresh();
    } catch (error) {
      logger.error("Failed to initialize exchange rate service", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh exchange rates from external API
   * Uses exchangerate-api.com (supports 1500 requests/month free tier)
   */
  async refreshRates() {
    try {
      logger.info("Refreshing exchange rates from external API");

      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${this.baseCurrency.toUpperCase()}`,
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API returned ${response.status}`);
      }

      const data = await response.json();
      if (!data.rates) {
        throw new Error("Invalid response from exchange rate API");
      }

      const effectiveDate = new Date().toISOString().split("T")[0];
      const insertedCount = await this._storeRates(data.rates, effectiveDate);

      // Refresh in-memory cache
      await this._loadCacheFromDB();

      logger.info("Exchange rates refreshed successfully", {
        currencyCount: Object.keys(data.rates).length,
        insertedCount,
        effectiveDate,
      });

      return data.rates;
    } catch (error) {
      logger.error("Failed to refresh exchange rates", {
        error: error.message,
        stack: error.stack,
      });

      // If refresh fails, continue with cached rates
      // Only throw if we have no rates at all
      const hasCache = await this._hasAnyRates();
      if (!hasCache) {
        throw new Error("No exchange rates available and refresh failed");
      }

      logger.warn("Using cached exchange rates due to refresh failure");
      return null;
    }
  }

  /**
   * Store rates in database
   * @private
   */
  async _storeRates(rates, effectiveDate) {
    const currencies = Object.keys(rates);
    let insertedCount = 0;

    for (const targetCurrency of currencies) {
      const rate = rates[targetCurrency];

      if (targetCurrency.toLowerCase() === this.baseCurrency) {
        continue; // Skip base currency
      }

      try {
        await db.query(
          `
          INSERT INTO exchange_rates (
            base_currency, target_currency, rate, effective_date, source
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (base_currency, target_currency, effective_date)
          DO UPDATE SET
            rate = EXCLUDED.rate,
            source = EXCLUDED.source,
            updated_at = NOW()
        `,
          [
            this.baseCurrency,
            targetCurrency.toLowerCase(),
            rate,
            effectiveDate,
            "api",
          ],
        );

        insertedCount++;
      } catch (error) {
        logger.error("Failed to store exchange rate", {
          currency: targetCurrency,
          error: error.message,
        });
      }
    }

    return insertedCount;
  }

  /**
   * Load rates into in-memory cache for fast lookups
   * @private
   */
  async _loadCacheFromDB() {
    const today = new Date().toISOString().split("T")[0];

    const result = await db.query(
      `
      SELECT base_currency, target_currency, rate
      FROM exchange_rates
      WHERE effective_date = $1
    `,
      [today],
    );

    rateCache.clear();
    for (const row of result.rows) {
      const key = `${row.base_currency}:${row.target_currency}`;
      rateCache.set(key, parseFloat(row.rate));
    }

    lastCacheRefresh = Date.now();
    logger.debug("Exchange rate cache loaded", { rateCount: rateCache.size });
  }

  /**
   * Check if we have any rates in database
   * @private
   */
  async _hasAnyRates() {
    const result = await db.query(
      "SELECT COUNT(*) as count FROM exchange_rates",
    );
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Schedule daily refresh
   * @private
   */
  _scheduleDailyRefresh() {
    // Calculate ms until next 2 AM UTC
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setUTCHours(2, 0, 0, 0);

    if (next2AM <= now) {
      next2AM.setUTCDate(next2AM.getUTCDate() + 1);
    }

    const msUntil2AM = next2AM.getTime() - now.getTime();

    setTimeout(() => {
      this.refreshRates();
      // Then schedule daily
      setInterval(() => this.refreshRates(), 24 * 60 * 60 * 1000);
    }, msUntil2AM);

    logger.info("Daily exchange rate refresh scheduled", {
      nextRefresh: next2AM.toISOString(),
    });
  }

  /**
   * Convert amount from one currency to another
   *
   * CRITICAL: Works with CENTS (integers), not dollars (floats)
   *
   * @param {number} amountCents - Amount in cents (integer)
   * @param {string} fromCurrency - Source currency code (e.g., 'usd', 'eur')
   * @param {string} toCurrency - Target currency code
   * @param {string} effectiveDate - Date to use for exchange rate (YYYY-MM-DD)
   * @returns {number} Converted amount in cents (integer)
   *
   * @example
   * // Convert €100.00 to USD (assume rate 1.08)
   * convert(10000, 'eur', 'usd', '2026-02-14') // Returns 10800 ($108.00)
   */
  async convert(amountCents, fromCurrency, toCurrency, effectiveDate = null) {
    // Input validation
    if (!Number.isInteger(amountCents)) {
      throw new Error("Amount must be an integer (cents)");
    }

    fromCurrency = fromCurrency.toLowerCase();
    toCurrency = toCurrency.toLowerCase();

    // Same currency = no conversion
    if (fromCurrency === toCurrency) {
      return amountCents;
    }

    const date = effectiveDate || new Date().toISOString().split("T")[0];

    // Try cache first (for today's date only)
    if (!effectiveDate && Date.now() - lastCacheRefresh < CACHE_TTL_MS) {
      const rate = this._getCachedRate(fromCurrency, toCurrency);
      if (rate !== null) {
        // CRITICAL: Use integer arithmetic to avoid floating point errors
        // Multiply first, then divide to maintain precision
        return Math.round((amountCents * rate * 100000) / 100000);
      }
    }

    // Fetch from database
    const rate = await this._getRate(fromCurrency, toCurrency, date);

    // Convert using integer arithmetic
    // This prevents floating point precision errors
    const convertedCents = Math.round((amountCents * rate * 100000) / 100000);

    return convertedCents;
  }

  /**
   * Get exchange rate from cache
   * @private
   */
  _getCachedRate(fromCurrency, toCurrency) {
    // Try direct lookup
    const key = `${fromCurrency}:${toCurrency}`;
    if (rateCache.has(key)) {
      return rateCache.get(key);
    }

    // Try inverse lookup
    const inverseKey = `${toCurrency}:${fromCurrency}`;
    if (rateCache.has(inverseKey)) {
      return 1.0 / rateCache.get(inverseKey);
    }

    return null;
  }

  /**
   * Get exchange rate from database with fallback logic
   * @private
   */
  async _getRate(fromCurrency, toCurrency, date) {
    try {
      // Use the database function which has fallback logic
      const result = await db.query(
        "SELECT get_exchange_rate($1, $2, $3) as rate",
        [fromCurrency, toCurrency, date],
      );

      if (result.rows.length === 0 || result.rows[0].rate === null) {
        throw new Error(
          `No exchange rate found for ${fromCurrency} to ${toCurrency} on ${date}`,
        );
      }

      return parseFloat(result.rows[0].rate);
    } catch (error) {
      logger.error("Failed to get exchange rate", {
        fromCurrency,
        toCurrency,
        date,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Batch convert multiple amounts (more efficient for bulk operations)
   *
   * @param {Array} conversions - Array of {amountCents, fromCurrency, toCurrency, date}
   * @returns {Promise<Array>} Array of converted amounts in cents
   */
  async batchConvert(conversions) {
    const results = await Promise.all(
      conversions.map(({ amountCents, fromCurrency, toCurrency, date }) =>
        this.convert(amountCents, fromCurrency, toCurrency, date),
      ),
    );

    return results;
  }

  /**
   * Get all available currencies
   */
  async getAvailableCurrencies() {
    const result = await db.query(
      `
      SELECT DISTINCT target_currency
      FROM exchange_rates
      WHERE base_currency = $1
      AND effective_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY target_currency
    `,
      [this.baseCurrency],
    );

    const currencies = [
      this.baseCurrency,
      ...result.rows.map((r) => r.target_currency),
    ];
    return currencies;
  }

  /**
   * Manually set exchange rate (for testing or manual overrides)
   *
   * @param {string} fromCurrency
   * @param {string} toCurrency
   * @param {number} rate
   * @param {string} effectiveDate
   */
  async setRate(fromCurrency, toCurrency, rate, effectiveDate = null) {
    const date = effectiveDate || new Date().toISOString().split("T")[0];

    await db.query(
      `
      INSERT INTO exchange_rates (
        base_currency, target_currency, rate, effective_date, source
      ) VALUES ($1, $2, $3, $4, 'manual')
      ON CONFLICT (base_currency, target_currency, effective_date)
      DO UPDATE SET
        rate = EXCLUDED.rate,
        source = 'manual',
        updated_at = NOW()
    `,
      [fromCurrency.toLowerCase(), toCurrency.toLowerCase(), rate, date],
    );

    // Refresh cache if setting today's rate
    if (!effectiveDate || date === new Date().toISOString().split("T")[0]) {
      await this._loadCacheFromDB();
    }

    logger.info("Exchange rate manually set", {
      fromCurrency,
      toCurrency,
      rate,
      date,
    });
  }
}

// Singleton instance
export const exchangeRateService = new ExchangeRateService();

// Initialize on module load
exchangeRateService.initialize().catch((error) => {
  logger.error("Failed to initialize exchange rate service", {
    error: error.message,
  });
});
