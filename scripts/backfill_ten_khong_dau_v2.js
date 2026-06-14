/**
 * Backfill tenKhongDau cho KhachHang, NhaCungCap, Combo, KhuyenMai
 * (tiếp theo backfill_ten_khong_dau.js đã chạy cho HangHoa).
 *
 * Cách dùng:
 *   node scripts/backfill_ten_khong_dau_v2.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const KhachHang = require('../src/models/KhachHang');
const NhaCungCap = require('../src/models/NhaCungCap');
const Combo = require('../src/models/Combo');
const KhuyenMai = require('../src/models/KhuyenMai');
const { removeDiacritics } = require('../src/utils/searchUtils');

async function backfill(Model, label, getTen) {
  const items = await Model.find();
  console.log(`Tổng số ${label}: ${items.length}`);
  let updated = 0;
  for (const item of items) {
    const expected = removeDiacritics(getTen(item));
    if (item.tenKhongDau !== expected) {
      item.tenKhongDau = expected;
      try {
        await item.save();
        updated++;
      } catch (err) {
        // Một số bản ghi cũ có thể không qua được validate hiện tại — bỏ qua, dùng updateOne trực tiếp
        await Model.updateOne({ _id: item._id }, { $set: { tenKhongDau: expected } });
        updated++;
      }
    }
  }
  console.log(`Đã cập nhật tenKhongDau cho ${updated}/${items.length} ${label}`);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  await backfill(KhachHang, 'khách hàng', (item) => item.tenKhachHang);
  await backfill(NhaCungCap, 'nhà cung cấp', (item) => item.tenNhaCungCap);
  await backfill(Combo, 'combo', (item) => item.tenCombo);
  await backfill(KhuyenMai, 'khuyến mãi', (item) => item.ten);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
