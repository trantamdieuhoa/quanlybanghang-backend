const HangHoa    = require('../models/HangHoa');
const BangGia    = require('../models/BangGia');
const DanhMuc    = require('../models/DanhMuc');
const NhaCungCap = require('../models/NhaCungCap');
const HoaDon     = require('../models/HoaDon');
const PhieuNhap  = require('../models/PhieuNhap');
const ThuChi     = require('../models/ThuChi');
const KhachHang  = require('../models/KhachHang');

const HD = 'Hoạt động';

// GET /api/reports/dashboard
exports.dashboard = async (req, res) => {
  try {
    const [
      tongHangHoa, hangHoaHoatDong, tongBangGia,
      tongDanhMuc, tongNCC, phanBoDanhMuc,
    ] = await Promise.all([
      HangHoa.countDocuments(),
      HangHoa.countDocuments({ trangThai: HD }),
      BangGia.countDocuments({ trangThai: HD }),
      DanhMuc.countDocuments({ trangThai: HD }),
      NhaCungCap.countDocuments({ trangThai: HD }),
      HangHoa.aggregate([
        { $match: { trangThai: HD } },
        { $group: { _id: '$danhMuc', soLuong: { $sum: 1 } } },
        { $sort: { soLuong: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const [topBangGia, hangSapHet] = await Promise.all([
      BangGia.aggregate([
        { $match: { trangThai: HD } },
        { $group: { _id: '$maHangHoa', tenHangHoa: { $first: '$tenHangHoa' }, soQuyCach: { $sum: 1 } } },
        { $sort: { soQuyCach: -1 } },
        { $limit: 10 },
      ]),
      HangHoa.find({
        trangThai: HD,
        $expr: { $lte: ['$tonKho', '$nguongCanhBao'] },
      }, 'tenHangHoa danhMuc tonKho nguongCanhBao')
        .sort({ tonKho: 1 })
        .limit(20)
        .lean(),
    ]);

    res.json({
      tongHangHoa,
      hangHoaHoatDong,
      hangHoaNgung: tongHangHoa - hangHoaHoatDong,
      tongBangGia,
      tongDanhMuc,
      tongNCC,
      phanBoDanhMuc: phanBoDanhMuc.map((d) => ({
        danhMuc: d._id || 'Chưa phân loại',
        soLuong: d.soLuong,
      })),
      topBangGia,
      hangSapHet,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reports/daily?date=YYYY-MM-DD
exports.daily = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const [hoaDons, phieuNhaps, thuChis, khachMoi] = await Promise.all([
      HoaDon.find({ ngayBan: { $gte: start, $lte: end }, trangThai: HD })
        .select('tenKhachHang tongTien daThanhToan conNo trangThaiTT chiTiet')
        .lean(),
      PhieuNhap.find({ ngayNhap: { $gte: start, $lte: end } })
        .select('tongTien').lean(),
      ThuChi.find({ ngayGiaoDich: { $gte: start, $lte: end } })
        .select('loai soTien').lean(),
      KhachHang.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);

    const doanhThu   = hoaDons.reduce((s, h) => s + (h.tongTien || 0), 0);
    const daThu      = hoaDons.reduce((s, h) => s + (h.daThanhToan || 0), 0);
    const conNo      = hoaDons.reduce((s, h) => s + (h.conNo || 0), 0);
    const nhapHang   = phieuNhaps.reduce((s, p) => s + (p.tongTien || 0), 0);
    const thuKhac    = thuChis.filter((t) => t.loai === 'Thu').reduce((s, t) => s + (t.soTien || 0), 0);
    const chiKhac    = thuChis.filter((t) => t.loai === 'Chi').reduce((s, t) => s + (t.soTien || 0), 0);
    const tongGiaVon = hoaDons.reduce((s, h) =>
      s + (h.chiTiet || []).reduce((ss, c) => ss + (c.giaVon || 0) * (c.soLuong || 0), 0), 0);
    const loiNhuanGop = doanhThu - tongGiaVon;

    const hoaDonList = hoaDons.map(({ chiTiet: _, ...rest }) => rest);

    res.json({
      doanhThu, daThu, conNo, nhapHang, thuKhac, chiKhac,
      tongGiaVon, loiNhuanGop,
      soHoaDon: hoaDons.length,
      khachHangMoi: khachMoi,
      hoaDons: hoaDonList,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reports/monthly?year=2025&month=05
exports.monthly = async (req, res) => {
  try {
    const year  = parseInt(req.query.year, 10)  || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59, 999);

    const [hoaDons, phieuNhaps, khachMoi] = await Promise.all([
      HoaDon.find({ ngayBan: { $gte: start, $lte: end }, trangThai: HD })
        .select('tongTien daThanhToan conNo ngayBan chiTiet')
        .lean(),
      PhieuNhap.find({ ngayNhap: { $gte: start, $lte: end } })
        .select('tongTien').lean(),
      KhachHang.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);

    const doanhThu    = hoaDons.reduce((s, h) => s + (h.tongTien || 0), 0);
    const daThu       = hoaDons.reduce((s, h) => s + (h.daThanhToan || 0), 0);
    const conNo       = hoaDons.reduce((s, h) => s + (h.conNo || 0), 0);
    const nhapHang    = phieuNhaps.reduce((s, p) => s + (p.tongTien || 0), 0);
    const tongGiaVon  = hoaDons.reduce((s, h) =>
      s + (h.chiTiet || []).reduce((ss, c) => ss + (c.giaVon || 0) * (c.soLuong || 0), 0), 0);
    const loiNhuanGop = doanhThu - tongGiaVon;

    const dayMap = {};
    for (const h of hoaDons) {
      const d = h.ngayBan
        ? new Date(h.ngayBan).toISOString().slice(0, 10)
        : '';
      if (!d) continue;
      dayMap[d] = (dayMap[d] || 0) + (h.tongTien || 0);
    }
    const byDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_id, dt]) => ({ _id, doanhThu: dt }));

    const prodMap = {};
    for (const h of hoaDons) {
      for (const ct of h.chiTiet || []) {
        const ma = ct.maHangHoa;
        if (!prodMap[ma]) {
          prodMap[ma] = { _id: ma, tenHangHoa: ct.tenHangHoa, soLuong: 0, doanhThu: 0 };
        }
        prodMap[ma].soLuong  += ct.soLuong || 0;
        prodMap[ma].doanhThu += ct.thanhTien || (ct.soLuong * ct.donGia) || 0;
      }
    }
    const topProducts = Object.values(prodMap)
      .sort((a, b) => b.doanhThu - a.doanhThu)
      .slice(0, 10);

    res.json({
      doanhThu, daThu, conNo, nhapHang,
      tongGiaVon, loiNhuanGop,
      soHoaDon: hoaDons.length,
      khachHangMoi: khachMoi,
      byDay,
      topProducts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
