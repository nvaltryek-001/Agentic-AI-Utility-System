import rateLimit from 'express-rate-limit';

// General rate limiter
export const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later.',
    skip: (req) => process.env.NODE_ENV === 'development',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for fault reporting
export const faultLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 reports per hour per IP
    message: 'Too many fault reports, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for OTP requests
export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 OTP requests per window
    message: 'Too many OTP requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

export default { generalLimiter, authLimiter, faultLimiter, otpLimiter };
