import { logger } from "./logger.js";

export const STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    RATE_LIMIT: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};

export const ERROR_CODES = {
    // Authentication
    AUTH_INVALID_CREDENTIALS: "auth/invalid-credentials",
    AUTH_TOKEN_EXPIRED: "auth/token-expired",
    AUTH_TOKEN_INVALID: "auth/token-invalid",
    AUTH_EMAIL_NOT_VERIFIED: "auth/email-not-verified",
    AUTH_ACCOUNT_EXISTS: "auth/account-exists",
    AUTH_NO_TOKEN: "auth/no-token",

    // Validation
    VALIDATION_EMAIL_INVALID: "validation/email-invalid",
    VALIDATION_PASSWORD_WEAK: "validation/password-weak",
    VALIDATION_REQUIRED_FIELD: "validation/required-field",
    VALIDATION_INVALID_FORMAT: "validation/invalid-format",

    // Resources
    RESOURCE_NOT_FOUND: "resource/not-found",
    RESOURCE_CONFLICT: "resource/conflict",
    RESOURCE_ACCESS_DENIED: "resource/access-denied",

    // Server
    SERVER_DATABASE_ERROR: "server/database-error",
    SERVER_INTERNAL_ERROR: "server/internal-error",
    SERVER_SERVICE_UNAVAILABLE: "server/service-unavailable",

    // Rate limiting
    RATE_LIMIT_EXCEEDED: "rate-limit/exceeded",
};

export const sendError = (res, status, message, code = null, field = null) => {
    const error = { message };

    if (code) error.code = code;
    if (field) error.field = field;

    // Log server errors (5xx)
    if (status >= 500) {
        logger.error('[ERROR_HANDLER] Server error', { status, message, code, field });
    }

    return res.status(status).json(error);
};

export const sendSuccess = (res, status, data, message = null) => {
    const response = { ...data };

    if (message) response.message = message;

    return res.status(status).json(response);
};

export const ErrorResponses = {

    // 400 Bad Request
    badRequest: (res, message = "Bad request") =>
        sendError(res, STATUS.BAD_REQUEST, message),

    validationError: (res, message, field = null) =>
        sendError(res, STATUS.BAD_REQUEST, message, ERROR_CODES.VALIDATION_INVALID_FORMAT, field),

    requiredField: (res, field) =>
        sendError(res, STATUS.BAD_REQUEST, `${field} is required`, ERROR_CODES.VALIDATION_REQUIRED_FIELD, field),

    invalidEmail: (res) =>
        sendError(res, STATUS.BAD_REQUEST, "Invalid email format", ERROR_CODES.VALIDATION_EMAIL_INVALID, "email"),

    weakPassword: (res) =>
        sendError(res, STATUS.BAD_REQUEST, "Password must be at least 8 characters and include mixed case + number", ERROR_CODES.VALIDATION_PASSWORD_WEAK, "password"),

    // 401 Unauthorized
    unauthorized: (res, message = "Unauthorized") =>
        sendError(res, STATUS.UNAUTHORIZED, message, ERROR_CODES.AUTH_TOKEN_INVALID),

    noToken: (res) =>
        sendError(res, STATUS.UNAUTHORIZED, "No token provided", ERROR_CODES.AUTH_NO_TOKEN),

    tokenExpired: (res) =>
        sendError(res, STATUS.UNAUTHORIZED, "Token expired", ERROR_CODES.AUTH_TOKEN_EXPIRED),

    invalidToken: (res) =>
        sendError(res, STATUS.UNAUTHORIZED, "Invalid token", ERROR_CODES.AUTH_TOKEN_INVALID),

    invalidCredentials: (res) =>
        sendError(res, STATUS.BAD_REQUEST, "Invalid credentials", ERROR_CODES.AUTH_INVALID_CREDENTIALS),

    emailNotVerified: (res) =>
        sendError(res, STATUS.UNAUTHORIZED, "Email not verified", ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED),

    // 403 Forbidden
    forbidden: (res, message = "Access denied") =>
        sendError(res, STATUS.FORBIDDEN, message, ERROR_CODES.RESOURCE_ACCESS_DENIED),

    // 404 Not Found
    notFound: (res, resource = "Resource") =>
        sendError(res, STATUS.NOT_FOUND, `${resource} not found`, ERROR_CODES.RESOURCE_NOT_FOUND),

    customerNotFound: (res) =>
        sendError(res, STATUS.NOT_FOUND, "Customer not found", ERROR_CODES.RESOURCE_NOT_FOUND),

    subscriptionNotFound: (res) =>
        sendError(res, STATUS.NOT_FOUND, "Subscription not found", ERROR_CODES.RESOURCE_NOT_FOUND),

    invoiceNotFound: (res) =>
        sendError(res, STATUS.NOT_FOUND, "Invoice not found", ERROR_CODES.RESOURCE_NOT_FOUND),

    // 409 Conflict
    conflict: (res, message = "Resource already exists") =>
        sendError(res, STATUS.CONFLICT, message, ERROR_CODES.RESOURCE_CONFLICT),

    accountExists: (res) =>
        sendError(res, STATUS.CONFLICT, "Account already exists", ERROR_CODES.AUTH_ACCOUNT_EXISTS, "email"),

    customerExists: (res) =>
        sendError(res, STATUS.CONFLICT, "Customer already exists", ERROR_CODES.RESOURCE_CONFLICT),

    // 429 Rate Limit
    rateLimitExceeded: (res, retryAfter = 900) => {
        const minutes = Math.ceil(retryAfter / 60);
        const message = `Too many requests. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        res.setHeader('Retry-After', retryAfter);
        return sendError(res, STATUS.RATE_LIMIT, message, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    },

    // 500 Internal Server Error
    internalError: (res, message = "Internal server error") =>
        sendError(res, STATUS.INTERNAL_ERROR, message, ERROR_CODES.SERVER_INTERNAL_ERROR),

    databaseError: (res, error = null) => {
        if (error) {
            logger.error('[DATABASE_ERROR]', { error: error.message, stack: error.stack });
        }
        return sendError(res, STATUS.INTERNAL_ERROR, "Database error occurred", ERROR_CODES.SERVER_DATABASE_ERROR);
    },

    // 503 Service Unavailable
    serviceUnavailable: (res, message = "Service temporarily unavailable") =>
        sendError(res, STATUS.SERVICE_UNAVAILABLE, message, ERROR_CODES.SERVER_SERVICE_UNAVAILABLE),
};

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger.error('[ASYNC_HANDLER] Unhandled error', {
                error: error.message,
                stack: error.stack,
                url: req.originalUrl,
                method: req.method,
            });

            // If headers already sent, delegate to Express error handler
            if (res.headersSent) {
                return next(error);
            }

            // Database errors
            if (error.code && error.code.startsWith('23')) {
                return ErrorResponses.databaseError(res, error);
            }

            // Default to internal error
            return ErrorResponses.internalError(res);
        });
    };
};

export const validateRequiredFields = (body, fields) => {
    for (const field of fields) {
        if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
            return {
                field,
                message: `${field} is required`,
                code: ERROR_CODES.VALIDATION_REQUIRED_FIELD,
            };
        }
    }
    return null;
};

export const errorMiddleware = (err, req, res, next) => {
    logger.error('[ERROR_MIDDLEWARE] Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    // Send standardized error response
    return ErrorResponses.internalError(res);
};

export default {
    STATUS,
    ERROR_CODES,
    sendError,
    sendSuccess,
    ErrorResponses,
    asyncHandler,
    validateRequiredFields,
    errorMiddleware,
};
