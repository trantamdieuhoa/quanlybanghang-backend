/**
 * Seed dữ liệu ban đầu:
 * - Tạo tài khoản admin mặc định
 * - Nhập danh mục và đơn vị tính từ file mẫu
 *
 * Chạy: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const DanhMuc = require('../src/models/DanhMuc');
const DonViTinh = require('../src/models/DonViTinh');

const DANH_MUC = [
  { maDanhMuc: 'DM001', tenDanhMuc: 'Sữa', moTa: 'Sữa hộp, sữa chai, sữa bột' },
  { maDanhMuc: 'DM002', tenDanhMuc: 'Thuốc', moTa: 'Các mặt hàng thuốc / dược phẩm' },
  { maDanhMuc: 'DM003', tenDanhMuc: 'Gia vị', moTa: 'Dầu ăn, nước mắm, đường, muối...' },
  { maDanhMuc: 'DM004', tenDanhMuc: 'Bánh kẹo', moTa: 'Bánh, kẹo, snack' },
  { maDanhMuc: 'DM005', tenDanhMuc: 'Đồ uống', moTa: 'Nước suối, nước ngọt, trà...' },
  { maDanhMuc: 'DM006', tenDanhMuc: 'Hoá phẩm', moTa: 'Nước giặt, nước rửa chén...' },
  { maDanhMuc: 'DM007', tenDanhMuc: 'Mì Tôm', moTa: 'Mì, Phở, hủ tiếu gói thùng' },
];

const DON_VI_TINH = ['chai', 'gói', 'cây', 'hộp', 'thùng', 'lốc', 'vỉ', 'lon', 'kg', 'cái'].map((t) => ({
  tenDonVi: t,
  ghiChu: t === 'thùng' ? 'Quy cách lớn' : t === 'lốc' ? 'Quy cách nhóm' : '',
}));

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Admin account
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await User.create({ username: 'admin', password: 'Admin@123', hoTen: 'Quản trị viên', role: 'admin' });
    console.log('✓ Admin created  (username: admin / password: Admin@123)');
  } else {
    console.log('✓ Admin already exists');
  }

  // DanhMuc
  for (const d of DANH_MUC) {
    await DanhMuc.findOneAndUpdate({ maDanhMuc: d.maDanhMuc }, d, { upsert: true });
  }
  console.log(`✓ ${DANH_MUC.length} danh mục seeded`);

  // DonViTinh
  for (const d of DON_VI_TINH) {
    await DonViTinh.findOneAndUpdate({ tenDonVi: d.tenDonVi }, d, { upsert: true });
  }
  console.log(`✓ ${DON_VI_TINH.length} đơn vị tính seeded`);

  await mongoose.disconnect();
  console.log('\nSeed hoàn tất!');
}

seed().catch((e) => { console.error(e); process.exit(1); });
