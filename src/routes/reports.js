const router = require('express').Router();
const { protect, requirePermission } = require('../middleware/auth');
const { dashboard, daily, monthly, weekly, congNoQuaHan } = require('../controllers/reportController');

router.get('/dashboard',       protect, requirePermission('xem_bao_cao'), dashboard);
router.get('/daily',           protect, requirePermission('xem_bao_cao'), daily);
router.get('/monthly',         protect, requirePermission('xem_bao_cao'), monthly);
router.get('/weekly',          protect, requirePermission('xem_bao_cao'), weekly);
router.get('/cong-no-qua-han', protect, requirePermission('xem_bao_cao'), congNoQuaHan);

module.exports = router;
