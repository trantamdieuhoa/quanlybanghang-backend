const router = require('express').Router();
const { login, refresh, register, getMe, changePassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login',   loginLimiter, login);
router.post('/refresh', refresh);
router.post('/register', protect, adminOnly, register);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
