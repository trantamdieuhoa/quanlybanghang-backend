/**
 * Backup MongoDB Atlas (MONGODB_URI) ra file .gz lưu trên PC bằng `mongodump`.
 *
 * Atlas/Railway vẫn là hệ thống chính (Hướng 1 trong HANDOFF.md) — script này
 * CHỈ ĐỌC (dump), không ghi/restore, dùng để có bản sao dữ liệu trên máy.
 *
 * Yêu cầu: cài MongoDB Database Tools (mongodump) và có trong PATH.
 *   https://www.mongodb.com/try/download/database-tools
 *
 * Cách dùng:
 *   node scripts/backup_mongo.js
 *
 * Cấu hình thêm qua .env (tuỳ chọn):
 *   BACKUP_DIR=D:\botreply\quanlybanghang\backups   (mặc định: ../../../backups)
 *   BACKUP_KEEP=14                                   (số bản gần nhất giữ lại, mặc định 14)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', '..', 'backups');
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 14;

if (!MONGO_URI) {
  console.error('[Backup] Thiếu MONGODB_URI/MONGO_URI trong .env — dừng.');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `quanlybanghang_${timestamp}.gz`;
const filePath = path.join(BACKUP_DIR, fileName);

/** Xoá các bản backup cũ, chỉ giữ BACKUP_KEEP bản gần nhất */
function rotate() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('quanlybanghang_') && f.endsWith('.gz'))
    .sort(); // tên file = timestamp ISO -> sort theo tên = sort theo thời gian

  const toDelete = files.slice(0, Math.max(0, files.length - BACKUP_KEEP));
  for (const f of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`[Backup] Đã xoá bản cũ: ${f}`);
  }
}

function run() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  console.log(`[Backup] Bắt đầu dump MongoDB -> ${filePath}`);
  const proc = spawn(
    'mongodump',
    [`--uri=${MONGO_URI}`, `--archive=${filePath}`, '--gzip'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  let stderr = '';
  proc.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  proc.on('error', (err) => {
    console.error('[Backup] Không chạy được mongodump:', err.message);
    console.error('[Backup] Kiểm tra đã cài MongoDB Database Tools và có trong PATH chưa.');
    process.exit(1);
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.error(`[Backup] mongodump thất bại (exit ${code}):\n${stderr}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      process.exit(code);
    }
    console.log(`[Backup] Hoàn tất: ${filePath}`);
    rotate();
  });
}

run();
