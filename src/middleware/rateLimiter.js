const rateLimit = require('express-rate-limit');

// Chống brute-force: tối đa 10 lần đăng nhập thất bại / 15 phút / IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút' },
});

module.exports = { loginLimiter };
