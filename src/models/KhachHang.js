const mongoose = require('mongoose');

const KhachHangSchema = new mongoose.Schema({
  maKhachHang:  { type: String, unique: true, default: () => 'KH' + Math.random().toString(36).substr(2, 6).toUpperCase() },
  tenKhachHang: { type: String, required: true, trim: true },
  soDienThoai:  { type: String, trim: true, default: '' },
  diaChi:       { type: String, trim: true, default: '' },
  email:        { type: String, default: '' },
  zalo:         { type: String, default: '' },       // số Zalo (thường = SĐT)
  cccd:         { type: String, default: '' },       // CCCD / CMND
  mst:          { type: String, default: '' },       // Mã số thuế
  tenCongTy:    { type: String, default: '' },       // Tên công ty
  hinhAnh:      { type: [String], default: [] },     // URL ảnh: CCCD, giấy phép KD...
  ghiChu:       { type: String, default: '' },
  tongCongNo:   { type: Number, default: 0 },
  tongMuaHang:  { type: Number, default: 0 },
  trangThai:    { type: String, enum: ['Hoạt động', 'Ngừng'], default: 'Hoạt động' },
}, { timestamps: true });

module.exports = mongoose.model('KhachHang', KhachHangSchema);
