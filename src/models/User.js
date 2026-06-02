const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Danh sách tất cả quyền có thể cấp cho nhân viên
const ALL_PERMISSIONS = [
  'ban_hang',       // Màn bán hàng + tạo hoá đơn
  'xem_hoa_don',    // Xem danh sách hoá đơn
  'xoa_hoa_don',    // Xoá hoá đơn (nguy hiểm)
  'nhap_hang',      // Tạo phiếu nhập
  'xem_hang_hoa',   // Xem hàng hoá + bảng giá
  'quan_ly_kh',     // Thêm/sửa khách hàng
  'xem_cong_no',    // Xem công nợ
  'xem_bao_cao',    // Xem báo cáo
  'xem_thu_chi',    // Xem thu chi
];

const DEFAULT_NV_PERMISSIONS = ['ban_hang', 'xem_hoa_don', 'nhap_hang', 'xem_hang_hoa', 'quan_ly_kh'];

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  hoTen: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'nhanvien'], default: 'nhanvien' },
  permissions: { type: [String], default: DEFAULT_NV_PERMISSIONS },
  trangThai: { type: String, enum: ['Hoạt động', 'Khoá'], default: 'Hoạt động' },
}, { timestamps: true });

module.exports.ALL_PERMISSIONS = ALL_PERMISSIONS;
module.exports.DEFAULT_NV_PERMISSIONS = DEFAULT_NV_PERMISSIONS;

// Hash password trước khi save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// So sánh password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
