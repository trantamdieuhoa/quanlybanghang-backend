const mongoose = require('mongoose');

const ChiTietSchema = new mongoose.Schema({
  maHangHoa:    { type: String, required: true },
  tenHangHoa:   { type: String, required: true },
  donVi:        { type: String, default: '' },
  soLuong:      { type: Number, required: true, min: 0 },
  donGia:       { type: Number, required: true, min: 0 },
  giaVon:       { type: Number, default: 0 },
  thanhTien:    { type: Number, default: 0 },
  soLuongDaTra: { type: Number, default: 0 },
}, { _id: true });

ChiTietSchema.pre('save', function(next) {
  this.thanhTien = this.soLuong * this.donGia;
  next();
});

const HoaDonSchema = new mongoose.Schema({
  maHoaDon: {
    type: String, unique: true,
    default: () => 'HD' + Date.now().toString(36).toUpperCase(),
  },
  maKhachHang:   { type: String, default: '' },
  tenKhachHang:  { type: String, default: 'Kh\u00e1ch l\u1ebd' },
  ngayBan:       { type: Date, default: Date.now },
  chiTiet:       [ChiTietSchema],
  tongTien:      { type: Number, default: 0 },
  giamGia:       { type: Number, default: 0 },
  tongThanhToan: { type: Number, default: 0 },
  daThanhToan:   { type: Number, default: 0 },
  conNo:         { type: Number, default: 0 },
  phuongThucTT:  { type: String, enum: ['Ti\u1ec1n m\u1eb7t','Chuy\u1ec3n kho\u1ea3n','C\u00f4ng n\u1ee3'], default: 'Ti\u1ec1n m\u1eb7t' },
  trangThaiTT:   { type: String, enum: ['\u0110\u00e3 thanh to\u00e1n','C\u00f2n n\u1ee3','Thanh to\u00e1n m\u1ed9t ph\u1ea7n'], default: '\u0110\u00e3 thanh to\u00e1n' },
  trangThai:     { type: String, enum: ['Ho\u1ea1t \u0111\u1ed9ng','\u0110\u00e3 hu\u1ef7'], default: 'Ho\u1ea1t \u0111\u1ed9ng' },
  ghiChu:        { type: String, default: '' },
  nguoiTao:      { type: String, default: '' },
  hinhAnh:       { type: [String], default: [] },  // ảnh chụp hoá đơn (base64)
}, { timestamps: true });

HoaDonSchema.pre('save', function(next) {
  this.tongTien      = this.chiTiet.reduce((s, c) => s + c.soLuong * c.donGia, 0);
  this.tongThanhToan = this.tongTien - (this.giamGia || 0);
  this.conNo         = Math.max(0, this.tongThanhToan - (this.daThanhToan || 0));
  if (this.conNo === 0) this.trangThaiTT = '\u0110\u00e3 thanh to\u00e1n';
  else if (this.daThanhToan > 0) this.trangThaiTT = 'Thanh to\u00e1n m\u1ed9t ph\u1ea7n';
  else this.trangThaiTT = 'C\u00f2n n\u1ee3';
  next();
});

module.exports = mongoose.model('HoaDon', HoaDonSchema);
