/**
 * SINGLE SOURCE OF TRUTH - API CONTRACTS
 * This file defines ALL request/response schemas for the entire application.
 * Frontend and backend MUST adhere to these contracts exactly.
 * 
 * Contract versioning: v1.0.0
 * Last updated: 2026-01-22
 */

// ============================================================================
// AUTHENTICATION CONTRACTS
// ============================================================================

export const AuthContracts = {
  
  // POST /api/auth/signup
  signup: {
    request: {
      email: "string (required, valid email format)",
      password: "string (required, min 8 chars, mixed case + number)",
      companyName: "string (optional, 3-100 chars)",
    },
    response: {
      success: {
        status: 201,
        body: {
          user: {
            id: "uuid",
            email: "string",
            companyName: "string | null",
          },
          message: "string",
        },
      },
      errors: {
        400: { message: "string" }, // Validation errors
        500: { message: "string" }, // Server errors
      },
    },
  },

  // POST /api/auth/login
  login: {
    request: {
      email: "string (required, valid email format)",
      password: "string (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          token: "string (JWT, expires in 7d)",
          user: {
            id: "uuid",
            email: "string",
            companyName: "string | null",
          },
          message: "string",
        },
      },
      errors: {
        400: { message: "string" }, // Invalid credentials
        500: { message: "string" }, // Server errors
      },
    },
  },

  // POST /api/auth/logout
  logout: {
    request: null, // No body required
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          message: "string",
        },
      },
      errors: {
        401: { message: "string" }, // Not authenticated
        500: { message: "string" }, // Server errors
      },
    },
  },

  // POST /api/auth/verify-email
  verifyEmail: {
    request: {
      token: "string (required, JWT)",
    },
    response: {
      success: {
        status: 200,
        body: {
          message: "string",
        },
      },
      errors: {
        400: { message: "string" }, // Invalid/expired token
        500: { message: "string" }, // Server errors
      },
    },
  },

  // POST /api/auth/forgot-password
  forgotPassword: {
    request: {
      email: "string (required, valid email format)",
    },
    response: {
      success: {
        status: 200,
        body: {
          message: "string",
        },
      },
      errors: {
        400: { message: "string" }, // Invalid email
        500: { message: "string" }, // Server errors
      },
    },
  },
};

// ============================================================================
// CUSTOMER CONTRACTS
// ============================================================================

export const CustomerContracts = {
  
  // GET /api/customers
  getAll: {
    request: null,
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          customers: [
            {
              id: "uuid",
              stripe_customer_id: "string",
              email: "string",
              name: "string | null",
              created_at: "ISO 8601 timestamp",
              // Subscription summary
              active_subscriptions: "number",
              total_revenue: "number (cents)",
              status: "active | past_due | canceled | trialing | paused",
            },
          ],
          total: "number",
        },
      },
      errors: {
        401: { message: "string" }, // Unauthorized
        500: { message: "string" }, // Server errors
      },
    },
  },

  // GET /api/customers/:id
  getById: {
    request: null,
    params: {
      id: "uuid (required)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          customer: {
            id: "uuid",
            stripe_customer_id: "string",
            email: "string",
            name: "string | null",
            created_at: "ISO 8601 timestamp",
            subscriptions: [
              {
                id: "uuid",
                stripe_subscription_id: "string",
                status: "trialing | active | past_due | canceled | paused",
                amount: "number (cents)",
                currency: "string",
                billing_interval: "week | month | year",
                current_period_start: "ISO 8601 timestamp",
                current_period_end: "ISO 8601 timestamp",
                trial_end: "ISO 8601 timestamp | null",
                ended_at: "ISO 8601 timestamp | null",
              },
            ],
            total_revenue: "number (cents)",
            lifetime_value: "number (cents)",
          },
        },
      },
      errors: {
        401: { message: "string" },
        404: { message: "string" }, // Customer not found
        500: { message: "string" },
      },
    },
  },

  // GET /api/customers/:id/timeline
  getTimeline: {
    request: null,
    params: {
      id: "uuid (required)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          timeline: [
            {
              id: "uuid",
              type: "subscription_created | subscription_updated | subscription_canceled | invoice_paid | invoice_failed | payment_retry",
              title: "string",
              description: "string",
              timestamp: "ISO 8601 timestamp",
              metadata: {
                amount: "number (cents) | null",
                status: "string | null",
                // Additional context-specific fields
              },
            },
          ],
        },
      },
      errors: {
        401: { message: "string" },
        404: { message: "string" },
        500: { message: "string" },
      },
    },
  },

  // GET /api/customers/:id/statistics
  getStatistics: {
    request: null,
    params: {
      id: "uuid (required)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          statistics: {
            total_revenue: "number (cents)",
            lifetime_value: "number (cents)",
            active_subscriptions: "number",
            total_subscriptions: "number",
            failed_payments: "number",
            successful_payments: "number",
            average_invoice_amount: "number (cents)",
            churn_risk: "low | medium | high | null",
            days_since_signup: "number",
          },
        },
      },
      errors: {
        401: { message: "string" },
        404: { message: "string" },
        500: { message: "string" },
      },
    },
  },

  // POST /api/customers
  create: {
    request: {
      email: "string (required, valid email)",
      name: "string (optional)",
      stripe_customer_id: "string (optional, if importing)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 201,
        body: {
          customer: {
            id: "uuid",
            stripe_customer_id: "string",
            email: "string",
            name: "string | null",
            created_at: "ISO 8601 timestamp",
          },
          message: "string",
        },
      },
      errors: {
        400: { message: "string" }, // Validation errors
        401: { message: "string" },
        409: { message: "string" }, // Customer already exists
        500: { message: "string" },
      },
    },
  },
};

// ============================================================================
// DASHBOARD CONTRACTS
// ============================================================================

export const DashboardContracts = {
  
  // GET /api/dashboard/metrics
  getMetrics: {
    request: null,
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          metrics: {
            total_revenue: {
              value: "number (cents)",
              change: "number (percentage, e.g., 12.5 for 12.5% increase)",
              period: "month | week | day",
            },
            active_customers: {
              value: "number",
              change: "number (percentage)",
              period: "month | week | day",
            },
            active_subscriptions: {
              value: "number",
              change: "number (percentage)",
              period: "month | week | day",
            },
            mrr: {
              value: "number (cents, Monthly Recurring Revenue)",
              change: "number (percentage)",
              period: "month",
            },
            churn_rate: {
              value: "number (percentage)",
              change: "number (percentage)",
              period: "month",
            },
            failed_payments: {
              value: "number",
              change: "number (percentage)",
              period: "month | week | day",
            },
          },
          period_start: "ISO 8601 timestamp",
          period_end: "ISO 8601 timestamp",
        },
      },
      errors: {
        401: { message: "string" },
        500: { message: "string" },
      },
    },
  },

  // GET /api/dashboard/recent-transactions
  getRecentTransactions: {
    request: null,
    query: {
      limit: "number (optional, default 10, max 50)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          transactions: [
            {
              id: "uuid",
              customer_id: "uuid",
              customer_email: "string",
              customer_name: "string | null",
              type: "payment | refund | failed_payment",
              amount: "number (cents)",
              currency: "string",
              status: "succeeded | failed | pending | refunded",
              description: "string",
              timestamp: "ISO 8601 timestamp",
              invoice_id: "uuid | null",
              stripe_invoice_id: "string | null",
            },
          ],
          total: "number",
        },
      },
      errors: {
        401: { message: "string" },
        500: { message: "string" },
      },
    },
  },

  // GET /api/dashboard/revenue-trends
  getRevenueTrends: {
    request: null,
    query: {
      months: "number (optional, default 6, max 24)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          trends: [
            {
              period: "YYYY-MM (e.g., 2026-01)",
              revenue: "number (cents)",
              subscriptions: "number (active at end of period)",
              new_customers: "number",
              churned_customers: "number",
              mrr: "number (cents)",
            },
          ],
          summary: {
            total_revenue: "number (cents)",
            average_revenue_per_month: "number (cents)",
            growth_rate: "number (percentage)",
          },
        },
      },
      errors: {
        400: { message: "string" }, // Invalid months parameter
        401: { message: "string" },
        500: { message: "string" },
      },
    },
  },
};

// ============================================================================
// DUNNING CONTRACTS
// ============================================================================

export const DunningContracts = {
  
  // GET /api/dunning
  getList: {
    request: null,
    query: {
      status: "open | resolved | all (optional, default: open)",
      page: "number (optional, default 1)",
      limit: "number (optional, default 20, max 100)",
    },
    headers: {
      Authorization: "Bearer <token> (required)",
    },
    response: {
      success: {
        status: 200,
        body: {
          dunning_cases: [
            {
              id: "uuid",
              customer_id: "uuid",
              customer_email: "string",
              customer_name: "string | null",
              subscription_id: "uuid",
              invoice_id: "uuid",
              stripe_invoice_id: "string",
              amount_due: "number (cents)",
              amount_paid: "number (cents)",
              retry_count: "number",
              last_retry_at: "ISO 8601 timestamp | null",
              next_retry_at: "ISO 8601 timestamp | null",
              status: "open | resolved | abandoned",
              resolution: "paid | cancelled | manually_resolved | null",
              failed_at: "ISO 8601 timestamp",
              resolved_at: "ISO 8601 timestamp | null",
              created_at: "ISO 8601 timestamp",
            },
          ],
          pagination: {
            page: "number",
            limit: "number",
            total: "number",
            total_pages: "number",
          },
          summary: {
            total_open: "number",
            total_amount_at_risk: "number (cents)",
            avg_retry_count: "number",
          },
        },
      },
      errors: {
        400: { message: "string" }, // Invalid query parameters
        401: { message: "string" },
        500: { message: "string" },
      },
    },
  },
};

// ============================================================================
// SHARED TYPES AND CONSTANTS
// ============================================================================

export const SharedTypes = {
  
  // User object (returned after authentication)
  User: {
    id: "uuid",
    email: "string",
    companyName: "string | null",
  },

  // JWT Token payload
  JWTPayload: {
    id: "uuid (user id)",
    email: "string",
    iat: "number (issued at, Unix timestamp)",
    exp: "number (expires at, Unix timestamp)",
  },

  // Standard error response
  ErrorResponse: {
    message: "string (human-readable error message)",
    code: "string | undefined (optional machine-readable error code)",
    field: "string | undefined (optional field name for validation errors)",
  },

  // Pagination metadata
  Pagination: {
    page: "number (current page, 1-indexed)",
    limit: "number (items per page)",
    total: "number (total items)",
    total_pages: "number (total pages)",
  },
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const ValidationRules = {
  email: {
    format: "RFC 5322 compliant",
    maxLength: 254,
    transform: "lowercase, trim",
  },
  password: {
    minLength: 8,
    maxLength: 128,
    pattern: "At least one lowercase, one uppercase, one digit",
  },
  companyName: {
    minLength: 3,
    maxLength: 100,
    pattern: "Alphanumeric, spaces, hyphens, underscores",
  },
  uuid: {
    format: "RFC 4122 UUID v4",
  },
  currency: {
    format: "ISO 4217 (3-letter code)",
    default: "usd",
  },
  amount: {
    format: "Integer (cents, not dollars)",
    min: 0,
  },
};

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

export const AuthConfig = {
  tokenType: "JWT",
  tokenPrefix: "Bearer",
  headerName: "Authorization",
  storageKey: "auth_token", // Frontend localStorage key
  tokenExpiry: "7d", // 7 days
  
  // Token structure
  tokenFormat: "Authorization: Bearer <JWT_TOKEN>",
  
  // Protected routes require valid token
  protectedRoutes: [
    "/api/customers",
    "/api/customers/:id",
    "/api/customers/:id/timeline",
    "/api/customers/:id/statistics",
    "/api/dashboard/*",
    "/api/dunning",
    "/api/auth/logout",
    "/api/auth/profile",
  ],
  
  // Public routes (no token required)
  publicRoutes: [
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/verify-email",
    "/api/auth/forgot-password",
    "/api/webhooks/*",
  ],
};

// ============================================================================
// HTTP STATUS CODES USAGE
// ============================================================================

export const StatusCodes = {
  200: "OK - Successful GET, PUT, PATCH, DELETE",
  201: "Created - Successful POST with resource creation",
  204: "No Content - Successful request with no response body",
  400: "Bad Request - Validation error, malformed request",
  401: "Unauthorized - Missing or invalid authentication token",
  403: "Forbidden - Valid token but insufficient permissions",
  404: "Not Found - Resource does not exist",
  409: "Conflict - Resource already exists (e.g., duplicate email)",
  422: "Unprocessable Entity - Valid syntax but semantic errors",
  429: "Too Many Requests - Rate limit exceeded",
  500: "Internal Server Error - Unexpected server error",
  503: "Service Unavailable - Temporary server issue",
};

// ============================================================================
// ERROR CODES (MACHINE-READABLE)
// ============================================================================

export const ErrorCodes = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: "auth/invalid-credentials",
  AUTH_TOKEN_EXPIRED: "auth/token-expired",
  AUTH_TOKEN_INVALID: "auth/token-invalid",
  AUTH_EMAIL_NOT_VERIFIED: "auth/email-not-verified",
  AUTH_ACCOUNT_EXISTS: "auth/account-exists",
  
  // Validation errors
  VALIDATION_EMAIL_INVALID: "validation/email-invalid",
  VALIDATION_PASSWORD_WEAK: "validation/password-weak",
  VALIDATION_REQUIRED_FIELD: "validation/required-field",
  
  // Resource errors
  RESOURCE_NOT_FOUND: "resource/not-found",
  RESOURCE_CONFLICT: "resource/conflict",
  
  // Server errors
  SERVER_DATABASE_ERROR: "server/database-error",
  SERVER_INTERNAL_ERROR: "server/internal-error",
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: "rate-limit/exceeded",
};

export default {
  AuthContracts,
  CustomerContracts,
  DashboardContracts,
  DunningContracts,
  SharedTypes,
  ValidationRules,
  AuthConfig,
  StatusCodes,
  ErrorCodes,
};
