/**
 * fix_danhmuc_orphan.js
 * Reset danhMuc về '' cho các hàng hoá có danh mục không còn tồn tại trong DB
 * Chạy: node scripts/fix_danhmuc_orphan.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');
const DanhMuc  = require('../src/models/DanhMuc');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Lấy tất cả tên danh mục còn hoạt động
  const activeDM = await DanhMuc.find({ trangThai: 'Hoạt động' }).lean();
  const activeNames = new Set(activeDM.map(d => d.tenDanhMuc));
  console.log('Danh mục đang hoạt động:', [...activeNames]);

  // Tìm hàng hoá có danhMuc không rỗng và không nằm trong danh sách active
  const orphans = await HangHoa.find({
    danhMuc: { $nin: ['', ...activeNames] },
  }).lean();

  if (orphans.length === 0) {
    console.log('Không có hàng hoá nào bị orphan.');
    process.exit(0);
  }

  // Nhóm theo danhMuc để log rõ
  const groups = {};
  for (const h of orphans) {
    groups[h.danhMuc] = (groups[h.danhMuc] || 0) + 1;
  }
  console.log('Hàng hoá bị orphan:', groups);

  const result = await HangHoa.updateMany(
    { danhMuc: { $nin: ['', ...activeNames] } },
    { $set: { danhMuc: '' } }
  );
  console.log(`Đã reset ${result.modifiedCount} hàng hoá về danhMuc rỗng.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
