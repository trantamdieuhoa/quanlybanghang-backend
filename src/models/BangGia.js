const mongoose = require('mongoose');

const bangGiaSchema = new mongoose.Schema({
  maGia: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Format: BG{timestamp}_{index} — ví dụ: BG1779443581228_0
  },
  maHangHoa: {
    type: String,
    required: true,
    ref: 'HangHoa',
  },
  tenHangHoa: { type: String, default: '' },   // denormalized for quick read
  // Khi HangHoa.coBienThe = true, mỗi dòng giá gắn với 1 biến thể cụ thể (size/màu...)
  maBienThe: { type: String, default: '', ref: 'BienThe' },
  quyCachBan: { type: String, required: true, trim: true },  // chai, gói, thùng, lốc 6 chai...
  soLuongQuyDoi: { type: Number, required: true, min: 1 }, // 1, 6, 24...
  donViQuyCach: { type: String, required: true, trim: true },
  giaBan: { type: Number, required: true, min: 0 },
  giaTrenDonViNhoNhat: { type: Number, default: 0 },
  ghiChu: { type: String, default: '' },
  trangThai: {
    type: String,
    enum: ['Hoạt động', 'Ngừng'],
    default: 'Hoạt động',
  },
}, { timestamps: true });

// Tự tính giá trên đơn vị nhỏ nhất
bangGiaSchema.pre('save', function (next) {
  if (this.soLuongQuyDoi > 0) {
    this.giaTrenDonViNhoNhat = this.giaBan / this.soLuongQuyDoi;
  }
  next();
});

module.exports = mongoose.model('BangGia', bangGiaSchema);
