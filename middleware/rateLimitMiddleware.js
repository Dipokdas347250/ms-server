const { rateLimit } = require('express-rate-limit')

const limiter = (windowMinutes, limit, error) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error }),
  })

module.exports = {
  loginLimiter: limiter(15, 10, 'Too many sign-in attempts. Try again in 15 minutes.'),
  registerLimiter: limiter(60, 5, 'Too many sign-ups from this network. Try again in an hour.'),
  orderLimiter: limiter(10, 10, 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'),
  trackLimiter: limiter(10, 30, 'Too many lookups. Try again in a few minutes.'),
}
