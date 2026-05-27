const mongoose = require('mongoose');

const ThuChiSchema = new mongoose.Schema({
  maThuChi: {
    type: String, unique: true,
    default: () => 'TC' + Date.now().toString(36).toUpperCase(),
  },
  loai:      { type: String, enum: ['Thu','Chi'], required: true },
  soTien:    { type: Number, required: true, min: 0 },
  moTa:      { type: String, required: true, trim: true },
  danhMuc:   { type: String, default: '' },  // ví dụ: Tiền thuê, Điện nước...
  phuongThuc:{ type: String, enum: ['Tiền mặt','Chuyển khoản'], default: 'Tiền mặt' },
  ngayThuChi:{ type: Date, default: Date.now },
  nguoiTao:  { type: String, default: '' },
  ghiChu:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ThuChi', ThuChiSchema);
