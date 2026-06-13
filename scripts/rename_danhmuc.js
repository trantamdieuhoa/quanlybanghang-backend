/**
 * Đổi tên DanhMuc theo maDanhMuc + cascade sang HangHoa.danhMuc (chuỗi tên).
 * Dùng để vá dữ liệu đã bị lệch (DanhMuc bị Sheets import revert lại tên cũ
 * do importDanhMuc trước đây không có guard theo lastExportAt — đã fix trong
 * sheetsSync.js).
 *
 * Cách dùng:
 *   node scripts/rename_danhmuc.js <maDanhMuc> "<tên mới>"
 *
 * Ví dụ:
 *   node scripts/rename_danhmuc.js DM004 "Bánh Tráng"
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const DanhMuc = require('../src/models/DanhMuc');
const HangHoa = require('../src/models/HangHoa');

async function run() {
  const [maDanhMuc, newTen] = process.argv.slice(2);
  if (!maDanhMuc || !newTen) {
    console.error('Thiếu tham số. Dùng: node scripts/rename_danhmuc.js <maDanhMuc> "<tên mới>"');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const item = await DanhMuc.findOne({ maDanhMuc });
  if (!item) {
    console.error(`Không tìm thấy DanhMuc với maDanhMuc=${maDanhMuc}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const oldTen = item.tenDanhMuc;
  console.log(`Đổi tên: "${oldTen}" -> "${newTen}"`);

  item.tenDanhMuc = newTen;
  await item.save(); // bump updatedAt — Sheets import guard sẽ không revert lại

  if (newTen !== oldTen) {
    const r = await HangHoa.updateMany(
      { danhMuc: oldTen },
      { $set: { danhMuc: newTen, ngayCapNhat: new Date() } }
    );
    console.log(`Đã cập nhật ${r.modifiedCount} hàng hoá`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
