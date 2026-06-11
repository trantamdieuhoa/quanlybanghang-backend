/**
 * fix_danhmuc_orphan.js
 * 1. Liệt kê tất cả giá trị danhMuc đang dùng trong HangHoa
 * 2. Reset danhMuc về '' cho các hàng hoá có danh mục không còn active
 * Chạy: node scripts/fix_danhmuc_orphan.js [--force "Tên danh mục"]
 *
 * Ví dụ xoá cụ thể: node scripts/fix_danhmuc_orphan.js --force "Hoá phẩm"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');
const DanhMuc  = require('../src/models/DanhMuc');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // Lấy tất cả tên danh mục đang hoạt động
  const activeDM = await DanhMuc.find({ trangThai: 'Hoạt động' }).lean();
  const activeNames = new Set(activeDM.map(d => d.tenDanhMuc));
  console.log('DanhMuc active:', [...activeNames]);

  // Liệt kê tất cả giá trị danhMuc đang dùng trong HangHoa
  const usedDM = await HangHoa.distinct('danhMuc');
  console.log('\ndanhMuc đang dùng trong HangHoa:', usedDM);

  // Tìm giá trị không còn trong active
  const orphanNames = usedDM.filter(n => n && !activeNames.has(n));
  console.log('\ndanhMuc orphan (cần reset):', orphanNames);

  // --force "Tên" → xoá cả danh mục đang active nếu user muốn
  const forceIdx = process.argv.indexOf('--force');
  if (forceIdx !== -1 && process.argv[forceIdx + 1]) {
    const forceName = process.argv[forceIdx + 1];
    console.log(`\n--force: xoá danh mục "${forceName}" khỏi DB và reset HangHoa`);
    const del = await DanhMuc.deleteOne({ tenDanhMuc: forceName });
    console.log(`  DanhMuc deleted: ${del.deletedCount}`);
    orphanNames.push(forceName);
  }

  if (orphanNames.length === 0) {
    console.log('\nKhông có gì cần reset.');
    process.exit(0);
  }

  const result = await HangHoa.updateMany(
    { danhMuc: { $in: orphanNames } },
    { $set: { danhMuc: '' } }
  );
  console.log(`\nĐã reset ${result.modifiedCount} hàng hoá.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
