const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const sheetsSync = require('../services/sheetsSync');

// Manual trigger sync (admin only)
router.post('/sync', protect, adminOnly, async (req, res) => {
  try {
    const result = await sheetsSync.syncAll();
    res.json({ message: 'Sync hoàn tất', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Import từ Sheets về MongoDB
router.post('/import', protect, adminOnly, async (req, res) => {
  try {
    const result = await sheetsSync.importFromSheets();
    res.json({ message: 'Import hoàn tất', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
