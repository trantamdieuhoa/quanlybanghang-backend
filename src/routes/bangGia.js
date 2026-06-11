const router = require('express').Router();
const ctrl = require('../controllers/bangGiaController');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
router.post('/', requirePermission('quan_ly_hang_hoa'), ctrl.create);
router.put('/:maGia', requirePermission('quan_ly_hang_hoa'), ctrl.update);
router.delete('/:maGia', requirePermission('quan_ly_hang_hoa'), ctrl.remove);

module.exports = router;
