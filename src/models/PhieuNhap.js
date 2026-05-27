const mongoose = require('mongoose');

const ChiTietNhapSchema = new mongoose.Schema({
  maHangHoa:    { type: String, required: true },
  tenHangHoa:   { type: String, required: true },
  donVi:        { type: String, default: '' },
  soLuong:      { type: Number, required: true, min: 0 },
  donGia:       { type: Number, required: true, min: 0 },
  thanhTien:    { type: Number, default: 0 },
  soLuongDaTra: { type: Number, default: 0 },
}, { _id: true });

const PhieuNhapSchema = new mongoose.Schema({
  maPhieuNhap: {
    type: String, unique: true,
    default: () => 'PN' + Date.now().toString(36).toUpperCase(),
  },
  maNhaCungCap:  { type: String, default: '' },
  tenNhaCungCap: { type: String, default: '' },
  ngayNhap:      { type: Date, default: Date.now },
  chiTiet:       [ChiTietNhapSchema],
  tongTien:      { type: Number, default: 0 },
  daThanhToan:   { type: Number, default: 0 },
  conNo:         { type: Number, default: 0 },
  phuongThucTT:  { type: String, enum: ['Tiền mặt','Chuyển khoản','Công nợ'], default: 'Công nợ' },
  trangThaiTT:   { type: String, enum: ['Đã thanh toán','Còn nợ','Thanh toán một phần'], default: 'Còn nợ' },
  trangThai:     { type: String, enum: ['Hoạt động','Đã huỷ'], default: 'Hoạt động' },
  ghiChu:        { type: String, default: '' },
  nguoiTao:      { type: String, default: '' },
}, { timestamps: true });

PhieuNhapSchema.pre('save', function(next) {
  this.tongTien = this.chiTiet.reduce((s, c) => s + c.soLuong * c.donGia, 0);
  this.conNo    = Math.max(0, this.tongTien - (this.daThanhToan || 0));
  if (this.conNo === 0) this.trangThaiTT = 'Đã thanh toán';
  else if (this.daThanhToan > 0) this.trangThaiTT = 'Thanh toán một phần';
  else this.trangThaiTT = 'Còn nợ';
  next();
});

module.exports = mongoose.model('PhieuNhap', PhieuNhapSchema);
