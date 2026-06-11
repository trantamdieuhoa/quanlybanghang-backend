// Cấp thêm 1 hoặc nhiều permission cho 1 user (không xoá permission cũ)
//
// Chạy: node scripts/grant_permission.js <username> <permission1> [permission2] ...
// Ví dụ: node scripts/grant_permission.js nv01 xem_cong_no xem_bao_cao
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { ALL_PERMISSIONS } = require('../src/models/User');

async function run() {
  const [username, ...perms] = process.argv.slice(2);
  if (!username || perms.length === 0) {
    console.log('Cách dùng: node scripts/grant_permission.js <username> <permission1> [permission2] ...');
    console.log('Permission hợp lệ:', ALL_PERMISSIONS.join(', '));
    process.exit(1);
  }

  const invalid = perms.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (invalid.length > 0) {
    console.error('Permission không hợp lệ:', invalid.join(', '));
    console.log('Permission hợp lệ:', ALL_PERMISSIONS.join(', '));
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) {
    console.error(`Không tìm thấy user "${username}"`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const before = new Set(user.permissions || []);
  perms.forEach((p) => before.add(p));
  user.permissions = Array.from(before);
  await user.save();

  console.log(`Đã cập nhật "${username}" — permissions: ${user.permissions.join(', ')}`);
  await mongoose.disconnect();
}

run().catch(console.error);
