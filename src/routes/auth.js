const router = require('express').Router();
const { login, register, getMe, changePassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', protect, adminOnly, register);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
