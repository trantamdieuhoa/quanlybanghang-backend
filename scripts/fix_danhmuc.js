/**
 * Sửa dữ liệu cũ: cập nhật lại HangHoa.danhMuc (chuỗi tên danh mục) sau khi
 * đã đổi tên DanhMuc nhưng các HangHoa hiện có vẫn còn lưu tên cũ.
 *
 * Nguyên nhân: danhMucController.update (trước fix) chỉ đổi tên trong
 * collection DanhMuc, không cascade sang HangHoa.danhMuc (lưu dạng chuỗi
 * tên, không phải ref). Từ bản fix này, đổi tên qua app sẽ tự cascade —
 * script này chỉ dùng để vá dữ liệu đã bị lệch từ trước.
 *
 * Cách dùng:
 *   node scripts/fix_danhmuc.js "<tên cũ>" "<tên mới>"
 *
 * Ví dụ:
 *   node scripts/fix_danhmuc.js "bánh tráng,đồ khô" "bánh tráng"
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');

async function run() {
  const [oldTen, newTen] = process.argv.slice(2);
  if (!oldTen || !newTen) {
    console.error('Thiếu tham số. Dùng: node scripts/fix_danhmuc.js "<tên cũ>" "<tên mới>"');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const r = await HangHoa.updateMany(
    { danhMuc: oldTen },
    { $set: { danhMuc: newTen, ngayCapNhat: new Date() } }
  );
  console.log(`Đã cập nhật ${r.modifiedCount} hàng hoá: "${oldTen}" -> "${newTen}"`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
