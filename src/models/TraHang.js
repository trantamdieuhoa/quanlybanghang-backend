const mongoose = require('mongoose');

const ChiTietTraSchema = new mongoose.Schema({
  maHangHoa:   { type: String, required: true },
  tenHangHoa:  { type: String, required: true },
  donVi:       { type: String, default: '' },
  soLuongTra:  { type: Number, required: true, min: 1 },
  donGia:      { type: Number, required: true, min: 0 },
  thanhTien:   { type: Number, default: 0 },
}, { _id: true });

const TraHangSchema = new mongoose.Schema({
  maTraHang: {
    type: String, unique: true,
    default: () => 'TH' + Date.now().toString(36).toUpperCase(),
  },
  loai: {
    type: String,
    enum: ['KHACH_TRA','TRA_NCC'],
    required: true,
  },
  maRef:         { type: String, required: true },   // maHoaDon hoặc maPhieuNhap
  maKhachHang:   { type: String, default: '' },
  tenKhachHang:  { type: String, default: '' },
  maNhaCungCap:  { type: String, default: '' },
  tenNhaCungCap: { type: String, default: '' },
  chiTiet:       [ChiTietTraSchema],
  tongTienTra:   { type: Number, default: 0 },
  ghiChu:        { type: String, default: '' },
  ngayTraHang:   { type: Date, default: Date.now },
  nguoiTao:      { type: String, default: '' },
}, { timestamps: true });

TraHangSchema.pre('save', function(next) {
  this.tongTienTra = this.chiTiet.reduce((s, c) => s + c.soLuongTra * c.donGia, 0);
  this.chiTiet.forEach(c => { c.thanhTien = c.soLuongTra * c.donGia; });
  next();
});

module.exports = mongoose.model('TraHang', TraHangSchema);
