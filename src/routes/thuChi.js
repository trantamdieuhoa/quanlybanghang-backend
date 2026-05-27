const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/thuChiController');
router.use(protect);
router.get('/',    c.getAll);
router.post('/',   c.create);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
module.exports = router;
