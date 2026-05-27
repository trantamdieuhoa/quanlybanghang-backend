const mongoose = require('mongoose');

const donViTinhSchema = new mongoose.Schema({
  tenDonVi: { type: String, required: true, unique: true, trim: true },
  ghiChu: { type: String, default: '' },
  trangThai: { type: String, enum: ['Hoạt động', 'Ngừng'], default: 'Hoạt động' },
}, { timestamps: true });

module.exports = mongoose.model('DonViTinh', donViTinhSchema);
