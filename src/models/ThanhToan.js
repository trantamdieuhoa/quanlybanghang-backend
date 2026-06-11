const mongoose = require('mongoose');

const ThanhToanSchema = new mongoose.Schema({
  maThanhToan: {
    type: String, unique: true,
    default: () => 'TT' + Date.now().toString(36).toUpperCase(),
  },
  loai: {
    type: String,
    enum: ['KHACH_TRA_NO','THANH_TOAN_HD','TRA_TIEN_NCC','THANH_TOAN_PN'],
    required: true,
  },
  maRef:         { type: String, default: '' },   // maHoaDon hoặc maPhieuNhap
  maKhachHang:   { type: String, default: '' },
  tenKhachHang:  { type: String, default: '' },
  maNhaCungCap:  { type: String, default: '' },
  tenNhaCungCap: { type: String, default: '' },
  soTien:        { type: Number, required: true, min: 0 },
  phuongThuc:    { type: String, enum: ['Tiền mặt','Chuyển khoản','QR chuyển khoản','Thẻ','Ví điện tử'], default: 'Tiền mặt' },
  ghiChu:        { type: String, default: '' },
  ngayThanhToan: { type: Date, default: Date.now },
  nguoiTao:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ThanhToan', ThanhToanSchema);
