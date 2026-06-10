const mongoose = require('mongoose');

const danhMucSchema = new mongoose.Schema({
  maDanhMuc: { type: String, required: true, unique: true, trim: true, uppercase: true },
  tenDanhMuc: { type: String, required: true, trim: true },
  moTa: { type: String, default: '' },
  trangThai: { type: String, enum: ['Hoạt động', 'Ngừng'], default: 'Hoạt động' },
}, { timestamps: true });

// Auto-generate maDanhMuc nếu không truyền lên
danhMucSchema.pre('validate', function (next) {
  if (!this.maDanhMuc) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    this.maDanhMuc = `DM${rand}`;
  }
  next();
});

module.exports = mongoose.model('DanhMuc', danhMucSchema);
