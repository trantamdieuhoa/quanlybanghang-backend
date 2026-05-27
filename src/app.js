require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const connectDB = require('./config/db');
const lanOnly   = require('./middleware/lanOnly');

// Routes
const authRoutes      = require('./routes/auth');
const hangHoaRoutes   = require('./routes/hangHoa');
const bangGiaRoutes   = require('./routes/bangGia');
const danhMucRoutes   = require('./routes/danhMuc');
const donViTinhRoutes = require('./routes/donViTinh');
const nhaCungCapRoutes= require('./routes/nhaCungCap');
const sheetsRoutes    = require('./routes/sheets');
const importRoutes    = require('./routes/import');
const reportRoutes    = require('./routes/reports');
const khachHangRoutes = require('./routes/khachHang');
const hoaDonRoutes    = require('./routes/hoaDon');
const phieuNhapRoutes = require('./routes/phieuNhap');
const thanhToanRoutes = require('./routes/thanhToan');
const traHangRoutes   = require('./routes/traHang');
const thuChiRoutes    = require('./routes/thuChi');
const congNoRoutes    = require('./routes/congNo');
const lichSuRoutes    = require('./routes/lichSu');

const app = express();
connectDB();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// LAN-only middleware (chi active khi co ALLOWED_SUBNET trong env)
if (process.env.ALLOWED_SUBNET) app.use(lanOnly);

// Health check endpoint (Railway uses this)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// TEMPORARY seed endpoint — xoá sau khi dùng
app.post('/api/init-seed', async (req, res) => {
  if (req.headers['x-seed-key'] !== 'seed-2026') return res.status(403).json({ message: 'Forbidden' });
  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    const DanhMuc = require('./models/DanhMuc');
    const DonViTinh = require('./models/DonViTinh');

    const results = {};

    // Admin
    const exists = await User.findOne({ username: 'admin' });
    if (!exists) {
      await User.create({ username: 'admin', password: 'Admin@123', hoTen: 'Quản trị viên', role: 'admin' });
      results.admin = 'created';
    } else {
      const hash = await bcrypt.hash('Admin@123', 10);
      await User.collection.updateOne({ username: 'admin' }, { $set: { password: hash } });
      results.admin = 'password reset';
    }

    // DanhMuc
    const danhMucs = [
      { maDanhMuc: 'DM001', tenDanhMuc: 'Sữa' },
      { maDanhMuc: 'DM002', tenDanhMuc: 'Thuốc' },
      { maDanhMuc: 'DM003', tenDanhMuc: 'Gia vị' },
      { maDanhMuc: 'DM004', tenDanhMuc: 'Bánh kẹo' },
      { maDanhMuc: 'DM005', tenDanhMuc: 'Đồ uống' },
      { maDanhMuc: 'DM006', tenDanhMuc: 'Hoá phẩm' },
      { maDanhMuc: 'DM007', tenDanhMuc: 'Mì Tôm' },
    ];
    for (const d of danhMucs) {
      await DanhMuc.updateOne({ maDanhMuc: d.maDanhMuc }, { $setOnInsert: d }, { upsert: true });
    }
    results.danhMuc = danhMucs.length + ' upserted';

    // DonViTinh
    const donViTinhs = ['chai','gói','cây','hộp','thùng','lốc','vỉ','lon','kg','cái'];
    for (const t of donViTinhs) {
      await DonViTinh.updateOne({ tenDonVi: t }, { $setOnInsert: { tenDonVi: t } }, { upsert: true });
    }
    results.donViTinh = donViTinhs.length + ' upserted';

    res.json({ message: 'Seed OK', results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API Routes
app.use('/api/auth',         authRoutes);
app.use('/api/hang-hoa',     hangHoaRoutes);
app.use('/api/bang-gia',     bangGiaRoutes);
app.use('/api/danh-muc',     danhMucRoutes);
app.use('/api/don-vi-tinh',  donViTinhRoutes);
app.use('/api/nha-cung-cap', nhaCungCapRoutes);
app.use('/api/sheets',       sheetsRoutes);
app.use('/api/import',       importRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/khach-hang',   khachHangRoutes);
app.use('/api/hoa-don',      hoaDonRoutes);
app.use('/api/phieu-nhap',   phieuNhapRoutes);
app.use('/api/thanh-toan',   thanhToanRoutes);
app.use('/api/tra-hang',     traHangRoutes);
app.use('/api/thu-chi',      thuChiRoutes);
app.use('/api/cong-no',      congNoRoutes);
app.use('/api/lich-su',      lichSuRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

const sheetsSync = require('./services/sheetsSync');

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log('Server running on port ' + PORT);
  console.log('Environment: ' + process.env.NODE_ENV);
  if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    try {
      const result = await sheetsSync.importFromSheets();
      console.log('[Sheets] Import OK:', result);
    } catch (err) {
      console.warn('[Sheets] Auto-import skipped:', err.message);
    }
    sheetsSync.startAutoSync();
  } else {
    console.log('[Sheets] Google Sheets not configured, skipping sync');
  }
});

module.exports = app;
