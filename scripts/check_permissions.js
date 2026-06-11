// Liệt kê user + permissions hiện tại, so sánh với ALL_PERMISSIONS
// Dùng để kiểm tra sau khi áp requirePermission cho các route mới
//
// Chạy: node scripts/check_permissions.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { ALL_PERMISSIONS } = require('../src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected\n');

  const users = await User.find({}, 'username hoTen role permissions trangThai').lean();

  for (const u of users) {
    console.log(`── ${u.username} (${u.hoTen || ''}) — role: ${u.role} — ${u.trangThai}`);
    if (u.role === 'admin') {
      console.log('   Admin — có tất cả quyền\n');
      continue;
    }
    const perms = u.permissions || [];
    const missing = ALL_PERMISSIONS.filter((p) => !perms.includes(p));
    console.log(`   Đang có: ${perms.join(', ') || '(không có)'}`);
    console.log(`   Chưa có: ${missing.join(', ') || '(đủ)'}\n`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
