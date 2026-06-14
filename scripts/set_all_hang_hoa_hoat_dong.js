/**
 * Cập nhật toàn bộ HangHoa đang ở trạng thái "Ngừng" về "Hoạt động".
 * Chạy 1 lần cho dữ liệu hiện tại.
 *
 * Cách dùng:
 *   node scripts/set_all_hang_hoa_hoat_dong.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const result = await HangHoa.updateMany(
    { trangThai: 'Ngừng' },
    { $set: { trangThai: 'Hoạt động', ngayCapNhat: new Date() } }
  );

  console.log(`Đã chuyển ${result.modifiedCount} hàng hoá về trạng thái Hoạt động`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
