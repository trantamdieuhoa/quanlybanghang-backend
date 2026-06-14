/**
 * Backfill chuẩn hoá HangHoa.trangThai về đúng 2 giá trị enum 'Hoạt động' / 'Ngừng'.
 *
 * Một số HangHoa đồng bộ từ Google Sheets có trangThai không khớp enum
 * (dư khoảng trắng, hoặc dấu tiếng Việt ở dạng Unicode tổ hợp NFD) do
 * importHangHoa dùng findOneAndUpdate (không chạy enum validator).
 * Hệ quả: dropdown "Trạng thái" trên Flutter hiển thị trống, badge trạng
 * thái trong danh sách hiển thị sai thành "Ngừng". Logic chuẩn hoá dưới
 * đây khớp với HangHoa.fromJson._normalizeTrangThai bên Flutter.
 *
 * Mặc định chạy ở chế độ DRY-RUN (chỉ in ra, KHÔNG sửa DB).
 * Thêm flag --apply để thực sự cập nhật.
 *
 * Cách dùng:
 *   node scripts/backfill_trang_thai.js          (dry-run, xem trước)
 *   node scripts/backfill_trang_thai.js --apply  (cập nhật thật)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');

const VALID = ['Hoạt động', 'Ngừng'];

function normalize(raw) {
  const v = (raw ?? '').toString().trim();
  if (VALID.includes(v)) return v;
  // Loại bỏ dấu kết hợp Unicode (NFD combining marks U+0300-U+036F)
  const stripped = v.replace(/[̀-ͯ]/g, '').toLowerCase();
  return stripped.includes('ngu') ? 'Ngừng' : 'Hoạt động';
}

async function run() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Mode:', apply ? 'APPLY' : 'DRY-RUN');

  const items = await HangHoa.find().select('maHangHoa tenHangHoa trangThai').lean();
  console.log(`Tổng số HangHoa: ${items.length}`);

  const toFix = [];
  for (const item of items) {
    const normalized = normalize(item.trangThai);
    if (item.trangThai !== normalized) {
      toFix.push({
        maHangHoa: item.maHangHoa,
        tenHangHoa: item.tenHangHoa,
        from: item.trangThai,
        to: normalized,
      });
    }
  }

  console.log(`Số HangHoa cần chuẩn hoá trangThai: ${toFix.length}`);
  for (const x of toFix) {
    console.log(`  [${x.maHangHoa}] ${x.tenHangHoa}: ${JSON.stringify(x.from)} -> "${x.to}"`);
  }

  if (apply && toFix.length > 0) {
    for (const x of toFix) {
      await HangHoa.updateOne({ maHangHoa: x.maHangHoa }, { $set: { trangThai: x.to } });
    }
    console.log(`Đã cập nhật ${toFix.length} HangHoa.`);
  } else if (!apply && toFix.length > 0) {
    console.log('Dry-run — chưa sửa gì. Chạy lại với --apply để cập nhật thật.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
