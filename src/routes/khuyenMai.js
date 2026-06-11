const router = require('express').Router();
const { protect, requirePermission } = require('../middleware/auth');
const c = require('../controllers/khuyenMaiController');

router.use(protect);
// Lấy danh sách KM đang hiệu lực — dùng trong màn bán hàng, nhân viên bán hàng cũng cần xem
router.get('/active', requirePermission(['ban_hang', 'quan_ly_khuyen_mai']), c.getActive);
router.get('/',     requirePermission(['quan_ly_khuyen_mai']), c.getAll);
router.get('/:id',  requirePermission(['quan_ly_khuyen_mai']), c.getOne);
router.post('/',    requirePermission(['quan_ly_khuyen_mai']), c.create);
router.put('/:id',  requirePermission(['quan_ly_khuyen_mai']), c.update);
router.delete('/:id', requirePermission(['quan_ly_khuyen_mai']), c.remove);

module.exports = router;
