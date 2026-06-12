const mongoose = require('mongoose');

// Lô hàng theo hạn sử dụng — chỉ dùng để theo dõi/cảnh báo HSD,
// KHÔNG ảnh hưởng đến luồng trừ/hoàn tonKho hiện có (bán hàng vẫn dùng HangHoa.tonKho tổng)
const LoHangSchema = new mongoose.Schema({
  hanSuDung:   { type: Date, required: true },
  soLuong:     { type: Number, required: true, min: 0 },
  ngayNhap:    { type: Date, default: Date.now },
  maPhieuNhap: { type: String, default: '' },
}, { _id: true });

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
  // Không set default '' — để field "absent" khi chưa nhập, tránh vi phạm
  // unique index (sparse chỉ bỏ qua field absent/null, không bỏ qua chuỗi rỗng)
  maVach: {
    type: String,
    trim: true,
    index: { unique: true, sparse: true },
  },
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
  coHang: { type: Boolean, default: true }, // tự chọn: true = còn hàng, false = hết hàng (độc lập tonKho)
  // true = hàng có biến thể (size/màu...) — tonKho tổng = sum(BienThe.tonKho), bán/nhập phải chọn biến thể
  coBienThe: { type: Boolean, default: false },
  ngayCapNhat: { type: Date, default: Date.now },
  // Danh sách lô hàng theo HSD — sắp xếp theo hanSuDung tăng dần để dễ cảnh báo
  lo: { type: [LoHangSchema], default: [] },
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
