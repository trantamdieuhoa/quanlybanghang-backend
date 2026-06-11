const mongoose = require('mongoose');

const ChiTietKiemKeSchema = new mongoose.Schema({
  maHangHoa:     { type: String, required: true },
  tenHangHoa:    { type: String, required: true },
  donVi:         { type: String, default: '' },
  tonKhoHeThong: { type: Number, required: true, default: 0 },
  tonKhoThucTe:  { type: Number, required: true, default: 0 },
  chenhLech:     { type: Number, default: 0 }, // thucTe - heThong
  giaVon:        { type: Number, default: 0 },
  ghiChu:        { type: String, default: '' },
}, { _id: false });

const PhieuKiemKeSchema = new mongoose.Schema({
  maPhieuKiemKe: {
    type: String, unique: true,
    default: () => 'KK' + Date.now().toString(36).toUpperCase(),
  },
  ngayKiemKe: { type: Date, default: Date.now },
  chiTiet:    [ChiTietKiemKeSchema],
  tongChenhLechSL:     { type: Number, default: 0 },
  tongChenhLechGiaTri: { type: Number, default: 0 },
  ghiChu:    { type: String, default: '' },
  // Nháp: chỉ lưu số liệu kiểm đếm, chưa đụng tới tonKho
  // Đã áp dụng: đã ghi đè tonKho HangHoa theo tonKhoThucTe
  trangThai: { type: String, enum: ['Nháp', 'Đã áp dụng'], default: 'Nháp' },
  nguoiTao:  { type: String, default: '' },
}, { timestamps: true });

PhieuKiemKeSchema.pre('save', function (next) {
  this.tongChenhLechSL = this.chiTiet.reduce((s, c) => s + (c.chenhLech || 0), 0);
  this.tongChenhLechGiaTri = this.chiTiet.reduce(
    (s, c) => s + (c.chenhLech || 0) * (c.giaVon || 0), 0);
  next();
});

module.exports = mongoose.model('PhieuKiemKe', PhieuKiemKeSchema);
