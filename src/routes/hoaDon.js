const router = require('express').Router();
const { protect, adminOnly, requirePermission } = require('../middleware/auth');
const c = require('../controllers/hoaDonController');
router.use(protect);
router.get('/',    requirePermission('xem_hoa_don'), c.getAll);
router.get('/:id', requirePermission('xem_hoa_don'), c.getOne);
router.post('/',   requirePermission('ban_hang'), c.create);
router.put('/:id/chi-tiet', requirePermission('ban_hang'), c.updateChiTiet);
router.put('/:id', requirePermission('ban_hang'), c.update);
router.delete('/:id/force', adminOnly, c.deleteForce);  // xoá hẳn (admin)
router.delete('/:id', requirePermission('xoa_hoa_don'), c.cancel); // huỷ (soft)
router.post('/:id/payment', requirePermission(['ban_hang', 'xem_cong_no']), c.addPayment);
module.exports = router;
