const router = require('express').Router();
const { protect, requirePermission } = require('../middleware/auth');
const c = require('../controllers/comboController');

router.use(protect);
// Danh sách combo đang hoạt động — dùng trong màn bán hàng
router.get('/active', requirePermission(['ban_hang', 'quan_ly_hang_hoa']), c.getActive);
router.get('/',     requirePermission(['quan_ly_hang_hoa']), c.getAll);
router.get('/:id',  requirePermission(['quan_ly_hang_hoa']), c.getOne);
router.post('/',    requirePermission(['quan_ly_hang_hoa']), c.create);
router.put('/:id',  requirePermission(['quan_ly_hang_hoa']), c.update);
router.delete('/:id', requirePermission(['quan_ly_hang_hoa']), c.remove);

module.exports = router;
