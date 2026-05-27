const router = require('express').Router();
const ctrl = require('../controllers/bangGiaController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:maGia', ctrl.update);
router.delete('/:maGia', ctrl.remove);

module.exports = router;
