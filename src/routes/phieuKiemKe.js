const router = require('express').Router();
const { protect, requirePermission } = require('../middleware/auth');
const c = require('../controllers/phieuKiemKeController');
router.use(protect);
router.get('/',           requirePermission(['kiem_ke_kho', 'quan_ly_hang_hoa']), c.getAll);
router.get('/:id',        requirePermission(['kiem_ke_kho', 'quan_ly_hang_hoa']), c.getOne);
router.post('/',          requirePermission(['kiem_ke_kho', 'quan_ly_hang_hoa']), c.create);
router.post('/:id/ap-dung', requirePermission(['kiem_ke_kho', 'quan_ly_hang_hoa']), c.apDung);
module.exports = router;
