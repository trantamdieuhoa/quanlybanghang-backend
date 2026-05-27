const mongoose = require('mongoose');

const danhMucSchema = new mongoose.Schema({
  maDanhMuc: { type: String, required: true, unique: true, trim: true },
  tenDanhMuc: { type: String, required: true, trim: true },
  moTa: { type: String, default: '' },
  trangThai: { type: String, enum: ['Hoạt động', 'Ngừng'], default: 'Hoạt động' },
}, { timestamps: true });

module.exports = mongoose.model('DanhMuc', danhMucSchema);
