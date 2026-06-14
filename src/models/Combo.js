const mongoose = require('mongoose');
const { removeDiacritics } = require('../utils/searchUtils');

const ThanhPhanSchema = new mongoose.Schema({
  maHangHoa:  { type: String, required: true },
  tenHangHoa: { type: String, default: '' },
  donVi:      { type: String, default: '' },
  soLuong:    { type: Number, required: true, min: 0.01 }, // số lượng đơn vị nhỏ nhất / 1 combo
}, { _id: false });

const comboSchema = new mongoose.Schema({
  maCombo: {
    type: String, unique: true,
    default: () => 'CB' + Date.now().toString(36).toUpperCase(),
  },
  tenCombo: { type: String, required: true, trim: true },
  tenKhongDau: { type: String, default: '', index: true },
  moTa:     { type: String, default: '' },
  thanhPhan: { type: [ThanhPhanSchema], default: [] },
  giaBan:   { type: Number, required: true, min: 0 },
  ghiChu:   { type: String, default: '' },
  trangThai: {
    type: String,
    enum: ['Hoạt động', 'Ngừng'],
    default: 'Hoạt động',
  },
}, { timestamps: true });

comboSchema.pre('validate', function (next) {
  if (!this.thanhPhan || this.thanhPhan.length === 0) {
    return next(new Error('Combo cần ít nhất 1 sản phẩm thành phần'));
  }
  next();
});

comboSchema.pre('save', function (next) {
  if (this.isModified('tenCombo') || !this.tenKhongDau) {
    this.tenKhongDau = removeDiacritics(this.tenCombo);
  }
  next();
});

module.exports = mongoose.model('Combo', comboSchema);
