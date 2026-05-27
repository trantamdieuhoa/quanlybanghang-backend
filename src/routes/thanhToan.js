const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/thanhToanController');
router.use(protect);
router.get('/',  c.getAll);
router.post('/', c.create);
module.exports = router;
