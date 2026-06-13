/**
 * Script kiểm tra: in ra danhMuc thực tế (kèm mã hex từng ký tự) của các
 * HangHoa có tên chứa "bánh tráng", và toàn bộ DanhMuc hiện có.
 * Dùng để debug lệch encoding/khoảng trắng khi fix_danhmuc.js báo 0 record.
 *
 * Cách dùng:
 *   node scripts/inspect_danhmuc.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const HangHoa = require('../src/models/HangHoa');
const DanhMuc = require('../src/models/DanhMuc');

function toHex(str) {
  return Buffer.from(str, 'utf8').toString('hex');
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected\n');

  console.log('=== DanhMuc ===');
  const dms = await DanhMuc.find().lean();
  for (const d of dms) {
    console.log(`maDanhMuc=${d.maDanhMuc} | tenDanhMuc="${d.tenDanhMuc}" | hex=${toHex(d.tenDanhMuc)}`);
  }

  console.log('\n=== HangHoa có tên chứa "bánh tráng" ===');
  const items = await HangHoa.find({ tenHangHoa: /bánh tráng/i }).select('tenHangHoa danhMuc').lean();
  for (const it of items) {
    console.log(`tenHangHoa="${it.tenHangHoa}" | danhMuc="${it.danhMuc}" | hex=${toHex(it.danhMuc || '')}`);
  }

  console.log('\n=== Distinct danhMuc trong HangHoa ===');
  const distinct = await HangHoa.distinct('danhMuc');
  for (const dm of distinct) {
    console.log(`"${dm}" | hex=${toHex(dm || '')}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
