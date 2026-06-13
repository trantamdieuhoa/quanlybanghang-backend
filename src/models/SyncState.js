const mongoose = require('mongoose');

// Lưu trạng thái đồng bộ Google Sheets — dùng để biết lần export gần nhất
// xảy ra lúc nào, từ đó importHangHoa có thể bỏ qua ghi đè các hàng hoá
// vừa được sửa trong app SAU lần export đó (tránh "hoàn tác" chỉnh sửa).
const syncStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'main' },
  lastExportAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('SyncState', syncStateSchema);
