const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getActivity } = require('../controllers/lichSuController');
router.use(protect);
router.get('/', getActivity);
module.exports = router;
