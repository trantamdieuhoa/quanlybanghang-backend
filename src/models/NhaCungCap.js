const mongoose = require('mongoose');

const nhaCungCapSchema = new mongoose.Schema({
  maNhaCungCap: { type: String, unique: true, trim: true,
    default: () => 'NCC' + Math.random().toString(36).substr(2,5).toUpperCase() },
  // alias cũ
  maNCC:       { type: String, trim: true },
  tenNhaCungCap:{ type: String, required: true, trim: true },
  tenNCC:      { type: String, trim: true },  // alias cũ
  soDienThoai: { type: String, default: '' },
  diaChi:      { type: String, default: '' },
  email:       { type: String, default: '' },
  ghiChu:       { type: String, default: '' },
  // Thông tin chuyển khoản
  tenNganHang:  { type: String, default: '' },
  soTaiKhoan:   { type: String, default: '' },
  chuTaiKhoan:  { type: String, default: '' },
  chiNhanhNH:   { type: String, default: '' },
  // Hình ảnh (URL)
  hinhAnh:      { type: [String], default: [] },
  tongCongNo:   { type: Number, default: 0 },
  trangThai:    { type: String, enum: ['Hoạt động','Ngừng'], default: 'Hoạt động' },
}, { timestamps: true });

// Đồng bộ alias trước khi validate
nhaCungCapSchema.pre('validate', function(next) {
  if (!this.maNhaCungCap && this.maNCC) this.maNhaCungCap = this.maNCC;
  if (!this.maNCC && this.maNhaCungCap) this.maNCC = this.maNhaCungCap;
  if (!this.tenNhaCungCap && this.tenNCC) this.tenNhaCungCap = this.tenNCC;
  if (!this.tenNCC && this.tenNhaCungCap) this.tenNCC = this.tenNhaCungCap;
  next();
});

module.exports = mongoose.model('NhaCungCap', nhaCungCapSchema);
