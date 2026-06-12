const mongoose = require('mongoose');

const LichSuSchema = new mongoose.Schema({
  hanhDong:        { type: String, required: true },
  nguoiThucHien:   { type: String, default: '' },
  thoiGian:        { type: Date, default: Date.now },
  chiTiet:         { type: String, default: '' },
}, { _id: false });

// Snapshot thành phần combo lúc bán — dùng để trừ/hoàn tồn kho và tính giaVon combo
const ComboThanhPhanSchema = new mongoose.Schema({
  maHangHoa:  { type: String, required: true },
  tenHangHoa: { type: String, default: '' },
  soLuong:    { type: Number, required: true, min: 0 }, // số lượng tiêu thụ / 1 combo
  giaVon:     { type: Number, default: 0 },
}, { _id: false });

const ChiTietSchema = new mongoose.Schema({
  maHangHoa:    { type: String, required: true },
  tenHangHoa:   { type: String, required: true },
  donVi:        { type: String, default: '' },
  soLuong:      { type: Number, required: true, min: 0 },
  donGia:       { type: Number, required: true, min: 0 },
  giaVon:       { type: Number, default: 0 },
  // Giảm giá riêng cho dòng này (số tiền, đồng) — trừ vào thanhTien của dòng
  giamGia:      { type: Number, default: 0, min: 0 },
  thanhTien:    { type: Number, default: 0 },
  soLuongDaTra: { type: Number, default: 0 },
  // Combo: nếu dòng này là combo, maCombo khác '' và comboThanhPhan chứa snapshot thành phần
  maCombo:        { type: String, default: '' },
  comboThanhPhan: { type: [ComboThanhPhanSchema], default: [] },
  // Biến thể (size/màu...) — nếu có, trừ/hoàn tonKho trên BienThe.tonKho thay vì HangHoa.tonKho
  maBienThe:  { type: String, default: '' },
  tenBienThe: { type: String, default: '' },
}, { _id: true });

ChiTietSchema.pre('save', function(next) {
  const tong = this.soLuong * this.donGia;
  this.thanhTien = Math.max(0, tong - (this.giamGia || 0));
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
  // Giảm giá cấp hoá đơn theo % (0-100). Nếu > 0 thì ưu tiên dùng thay cho giamGia (số tiền)
  giamGiaPhanTram: { type: Number, default: 0, min: 0, max: 100 },
  tongThanhToan: { type: Number, default: 0 },
  daThanhToan:   { type: Number, default: 0 },
  conNo:         { type: Number, default: 0 },
  phuongThucTT:  { type: String, enum: ['Ti\u1ec1n m\u1eb7t','Chuy\u1ec3n kho\u1ea3n','C\u00f4ng n\u1ee3','QR chuy\u1ec3n kho\u1ea3n','Th\u1ebb','V\u00ed \u0111i\u1ec7n t\u1eed'], default: 'Ti\u1ec1n m\u1eb7t' },
  trangThaiTT:   { type: String, enum: ['\u0110\u00e3 thanh to\u00e1n','C\u00f2n n\u1ee3','Thanh to\u00e1n m\u1ed9t ph\u1ea7n'], default: '\u0110\u00e3 thanh to\u00e1n' },
  trangThai:     { type: String, enum: ['Ho\u1ea1t \u0111\u1ed9ng','\u0110\u00e3 hu\u1ef7'], default: 'Ho\u1ea1t \u0111\u1ed9ng' },
  ghiChu:        { type: String, default: '' },
  nguoiTao:      { type: String, default: '' },
  hinhAnh:       { type: [String], default: [] },  // ảnh chụp hoá đơn (base64)
  lichSu:        { type: [LichSuSchema], default: [] },
}, { timestamps: true });

HoaDonSchema.pre('save', function(next) {
  // T\u1ed5ng ti\u1ec1n h\u00e0ng (ch\u01b0a tr\u1eeb gi\u1ea3m gi\u00e1 n\u00e0o)
  this.tongTien = this.chiTiet.reduce((s, c) => s + c.soLuong * c.donGia, 0);
  // T\u1ea1m t\u00ednh sau khi tr\u1eeb gi\u1ea3m gi\u00e1 t\u1eebng d\u00f2ng (chiTiet[].thanhTien \u0111\u00e3 tr\u1eeb giamGia d\u00f2ng)
  const subTotal = this.chiTiet.reduce((s, c) => s + Math.max(0, c.soLuong * c.donGia - (c.giamGia || 0)), 0);
  // Gi\u1ea3m gi\u00e1 c\u1ea5p ho\u00e1 \u0111\u01a1n: \u01b0u ti\u00ean % n\u1ebfu c\u00f3, ng\u01b0\u1ee3c l\u1ea1i d\u00f9ng s\u1ed1 ti\u1ec1n c\u1ed1 \u0111\u1ecbnh (giamGia)
  let giamGiaHoaDon;
  if (this.giamGiaPhanTram > 0) {
    giamGiaHoaDon = subTotal * this.giamGiaPhanTram / 100;
    this.giamGia = giamGiaHoaDon; // \u0111\u1ed3ng b\u1ed9 s\u1ed1 ti\u1ec1n th\u1ef1c t\u1ebf \u0111\u1ec3 hi\u1ec3n th\u1ecb/l\u01b0u tr\u1eef
  } else {
    giamGiaHoaDon = this.giamGia || 0;
  }
  this.tongThanhToan = Math.max(0, subTotal - giamGiaHoaDon);
  this.conNo         = Math.max(0, this.tongThanhToan - (this.daThanhToan || 0));
  if (this.conNo === 0) this.trangThaiTT = '\u0110\u00e3 thanh to\u00e1n';
  else if (this.daThanhToan > 0) this.trangThaiTT = 'Thanh to\u00e1n m\u1ed9t ph\u1ea7n';
  else this.trangThaiTT = 'C\u00f2n n\u1ee3';
  next();
});

module.exports = mongoose.model('HoaDon', HoaDonSchema);
