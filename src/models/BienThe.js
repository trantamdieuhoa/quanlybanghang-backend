const mongoose = require('mongoose');

// Biến thể sản phẩm (size/màu...) — mỗi biến thể là 1 "SKU con" của HangHoa,
// có tonKho/giaVon/maVach riêng. Giá bán theo quy cách nằm ở BangGia (maBienThe).
const bienTheSchema = new mongoose.Schema({
  maBienThe: {
    type: String,
    unique: true,
    default: () => 'BT' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000),
  },
  maHangHoa: { type: String, required: true, ref: 'HangHoa', index: true },
  tenBienThe: { type: String, required: true, trim: true }, // VD: "Size M - Đỏ"
  // Thuộc tính linh hoạt, VD: { size: 'M', mau: 'Đỏ' }
  thuocTinh: { type: Map, of: String, default: {} },
  // Không set default '' — để field "absent" khi chưa nhập, tránh vi phạm sparse unique index
  maVach: {
    type: String,
    trim: true,
    index: { unique: true, sparse: true },
  },
  // Danh sách mã vạch phụ — xem ghi chú trong models/HangHoa.js
  dsMaVach: { type: [String], default: [], index: true },
  tonKho: { type: Number, default: 0 },
  giaVon: { type: Number, default: 0 },
  trangThai: {
    type: String,
    enum: ['Hoạt động', 'Ngừng'],
    default: 'Hoạt động',
  },
}, { timestamps: true });

module.exports = mongoose.model('BienThe', bienTheSchema);
