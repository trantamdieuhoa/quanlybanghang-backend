const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const c = require('../controllers/hoaDonController');
router.use(protect);
router.get('/',    c.getAll);
router.get('/:id', c.getOne);
router.post('/',   c.create);
router.put('/:id/chi-tiet', c.updateChiTiet);
router.put('/:id', c.update);
router.delete('/:id/force', adminOnly, c.deleteForce);  // xoá hẳn (admin)
router.delete('/:id', c.cancel);                        // huỷ (soft)
router.post('/:id/payment', c.addPayment);
module.exports = router;
