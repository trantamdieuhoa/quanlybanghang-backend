const mongoose = require('mongoose');
const { v4: uuidv4 } = require('crypto');

const KhachHangSchema = new mongoose.Schema({
  maKhachHang: {
    type: String,
    unique: true,
    default: () => 'KH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  },
  tenKhachHang: { type: String, required: true, trim: true },
  soDienThoai:  { type: String, trim: true, default: '' },
  diaChi:       { type: String, trim: true, default: '' },
  ghiChu:       { type: String, default: '' },
  tongCongNo:   { type: Number, default: 0 },   // tổng nợ hiện tại
  tongMuaHang:  { type: Number, default: 0 },   // tổng doanh thu
  trangThai:    { type: String, enum: ['Hoạt động', 'Ngừng'], default: 'Hoạt động' },
}, { timestamps: true });

module.exports = mongoose.model('KhachHang', KhachHangSchema);
