require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function reset() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');
  const hash = await bcrypt.hash('Admin@123', 10);
  const r = await mongoose.connection.collection('users').updateOne(
    { username: 'admin' },
    { $set: { password: hash } }
  );
  console.log('Updated:', r.modifiedCount);
  await mongoose.disconnect();
}

reset().catch(console.error);
