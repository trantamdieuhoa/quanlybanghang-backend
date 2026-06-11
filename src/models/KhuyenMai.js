const mongoose = require('mongoose');

const khuyenMaiSchema = new mongoose.Schema({
  maKhuyenMai: {
    type: String, unique: true,
    default: () => 'KM' + Date.now().toString(36).toUpperCase(),
  },
  ten:  { type: String, required: true, trim: true },
  moTa: { type: String, default: '' },

  // PhanTram: giảm % | SoTien: giảm số tiền cố định | TangKem: tặng kèm sản phẩm
  loaiGiam: {
    type: String,
    enum: ['PhanTram', 'SoTien', 'TangKem'],
    required: true,
  },
  giaTriGiam: { type: Number, default: 0, min: 0 }, // % (0-100) hoặc số tiền — không dùng khi TangKem
  giamToiDa:  { type: Number, default: 0, min: 0 }, // giới hạn số tiền giảm khi loaiGiam = PhanTram, 0 = không giới hạn

  // Phạm vi áp dụng: theo sản phẩm cụ thể hoặc theo danh mục
  apDungCho:  { type: String, enum: ['SanPham', 'DanhMuc'], required: true },
  danhSachMa: { type: [String], default: [] }, // mã hàng hoá (SanPham) hoặc tên danh mục (DanhMuc)

  // Điều kiện áp dụng
  soLuongToiThieu: { type: Number, default: 1, min: 1 },

  // Chỉ dùng khi loaiGiam = TangKem
  tangKem: {
    maHangHoa:  { type: String, default: '' },
    tenHangHoa: { type: String, default: '' },
    soLuong:    { type: Number, default: 1, min: 1 },
  },

  // Thời hạn áp dụng
  ngayBatDau:  { type: Date, default: null },
  ngayKetThuc: { type: Date, default: null },

  trangThai: { type: String, enum: ['Hoạt động', 'Tạm dừng'], default: 'Hoạt động' },
  ghiChu:    { type: String, default: '' },
}, { timestamps: true });

khuyenMaiSchema.pre('validate', function (next) {
  if (this.loaiGiam === 'PhanTram' && this.giaTriGiam > 100) {
    return next(new Error('Giá trị giảm theo % không được vượt quá 100'));
  }
  if (this.loaiGiam === 'TangKem' && !this.tangKem?.maHangHoa) {
    return next(new Error('Khuyến mãi tặng kèm cần chọn sản phẩm tặng'));
  }
  if (this.danhSachMa.length === 0) {
    return next(new Error('Cần chọn ít nhất 1 sản phẩm hoặc danh mục áp dụng'));
  }
  if (this.ngayBatDau && this.ngayKetThuc && this.ngayBatDau > this.ngayKetThuc) {
    return next(new Error('Ngày bắt đầu phải trước ngày kết thúc'));
  }
  next();
});

module.exports = mongoose.model('KhuyenMai', khuyenMaiSchema);
