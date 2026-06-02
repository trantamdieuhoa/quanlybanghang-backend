const mongoose = require('mongoose');

const hangHoaSchema = new mongoose.Schema({
  maHangHoa: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    // Format: HH + random 8 chars (ví dụ: HHMPCGWJAL)
  },
  tenHangHoa: { type: String, required: true, trim: true },
  donViNhoNhat: { type: String, default: '' },
  danhMuc: {
    type: String,
    ref: 'DanhMuc',
    default: '',
  },
  nhaCungCap: { type: [String], default: [] },  // nhiều NCC — lưu mảng tên NCC
  giaVon:        { type: Number, default: 0 },
  tonKho:        { type: Number, default: 0 },
  nguongCanhBao: { type: Number, default: 10 },
  ghiChu:        { type: String, default: '' },
  trangThai: {
    type: String,
    enum: ['Hoạt động', 'Ngừng'],
    default: 'Hoạt động',
  },
  ngayCapNhat: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-generate maHangHoa trước khi validate (phải dùng pre validate, không phải pre save)
hangHoaSchema.pre('validate', function (next) {
  if (!this.maHangHoa) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    this.maHangHoa = `HH${rand}`;
  }
  next();
});

module.exports = mongoose.model('HangHoa', hangHoaSchema);
