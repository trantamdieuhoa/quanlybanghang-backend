const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { dashboard, daily, monthly, weekly } = require('../controllers/reportController');

router.get('/dashboard', protect, dashboard);
router.get('/daily',     protect, daily);
router.get('/monthly',   protect, monthly);
router.get('/weekly',    protect, weekly);

module.exports = router;
