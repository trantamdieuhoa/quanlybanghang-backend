const router = require('express').Router();
const ctrl = require('../controllers/bienTheController');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll); // ?maHangHoa=
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('quan_ly_hang_hoa'), ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', requirePermission('quan_ly_hang_hoa'), ctrl.remove);

module.exports = router;
