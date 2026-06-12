const router = require('express').Router();
const ctrl = require('../controllers/hangHoaController');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
// Đặt trước /:id để tránh "barcode" bị hiểu nhầm là maHangHoa
router.get('/barcode/:maVach', ctrl.getByBarcode);
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('quan_ly_hang_hoa'), ctrl.create);
// PUT để mở: nhân viên nhập hàng/bán hàng cần toggle coHang, điều chỉnh tồn kho qua route này
router.put('/:id', ctrl.update);
router.delete('/:id/lo/:loId', requirePermission('quan_ly_hang_hoa'), ctrl.removeLo);
router.delete('/:id', requirePermission('quan_ly_hang_hoa'), ctrl.remove);

module.exports = router;
