/**
 * Backfill field tenKhongDau cho toàn bộ HangHoa hiện có — phục vụ tìm kiếm
 * không phân biệt dấu tiếng Việt (xem src/utils/searchUtils.js).
 *
 * Cách dùng:
 *   node scripts/backfill_ten_khong_dau.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');
const { removeDiacritics } = require('../src/utils/searchUtils');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const items = await HangHoa.find().select('maHangHoa tenHangHoa tenKhongDau');
  console.log(`Tổng số hàng hoá: ${items.length}`);

  let updated = 0;
  for (const item of items) {
    const expected = removeDiacritics(item.tenHangHoa);
    if (item.tenKhongDau !== expected) {
      item.tenKhongDau = expected;
      await item.save();
      updated++;
    }
  }

  console.log(`Đã cập nhật tenKhongDau cho ${updated}/${items.length} hàng hoá`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
