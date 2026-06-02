const HoaDon    = require('../models/HoaDon');
const KhachHang = require('../models/KhachHang');
const HangHoa   = require('../models/HangHoa');

exports.getAll = async (req, res) => {
  try {
    const { search='', maKhachHang, trangThaiTT, from, to, page=1, limit=50 } = req.query;
    const filter = { trangThai: 'Hoạt động' };
    if (search) filter.$or = [
      { maHoaDon: new RegExp(search,'i') },
      { tenKhachHang: new RegExp(search,'i') },
    ];
    if (maKhachHang) filter.maKhachHang = maKhachHang;
    if (trangThaiTT) filter.trangThaiTT = trangThaiTT;
    if (from || to) {
      filter.ngayBan = {};
      if (from) filter.ngayBan.$gte = new Date(from);
      if (to)   filter.ngayBan.$lte = new Date(to + 'T23:59:59');
    }
    const skip = (page-1)*limit;
    const [data, total] = await Promise.all([
      HoaDon.find(filter).sort({ ngayBan: -1 }).skip(skip).limit(Number(limit)).select('-chiTiet'),
      HoaDon.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    res.json(hd);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body, nguoiTao: req.user?.username };
    if (Array.isArray(body.chiTiet) && body.chiTiet.length > 0) {
      const maCodes = [...new Set(body.chiTiet.map((c) => c.maHangHoa))];
      const hangHoas = await HangHoa.find({ maHangHoa: { $in: maCodes } })
        .select('maHangHoa giaVon tonKho').lean();
      const giaVonMap = Object.fromEntries(hangHoas.map((h) => [h.maHangHoa, h.giaVon || 0]));
      body.chiTiet = body.chiTiet.map((c) => ({ ...c, giaVon: giaVonMap[c.maHangHoa] ?? 0 }));
    }
    const hd = new HoaDon(body);
    await hd.save();
    const promises = [];
    for (const ct of hd.chiTiet) {
      promises.push(HangHoa.findOneAndUpdate({ maHangHoa: ct.maHangHoa }, { $inc: { tonKho: -ct.soLuong } }));
    }
    if (hd.maKhachHang) {
      promises.push(KhachHang.findOneAndUpdate(
        { maKhachHang: hd.maKhachHang },
        { $inc: { tongCongNo: hd.conNo > 0 ? hd.conNo : 0, tongMuaHang: hd.tongThanhToan } }
      ));
    }
    await Promise.all(promises);
    res.status(201).json(hd);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const old = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!old) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    Object.assign(old, req.body);
    await old.save();
    res.json(old);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.updateChiTiet = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    const oldChiTiet = hd.chiTiet;
    const newChiTiet = req.body.chiTiet || [];
    const allMa = new Set([
      ...oldChiTiet.map(c => c.maHangHoa),
      ...newChiTiet.map(c => c.maHangHoa),
    ]);
    const stockPromises = [];
    for (const ma of allMa) {
      const oldQty = (oldChiTiet.find(c => c.maHangHoa === ma) || {}).soLuong || 0;
      const newQty = (newChiTiet.find(c => c.maHangHoa === ma) || {}).soLuong || 0;
      const delta = newQty - oldQty;
      if (delta !== 0) {
        stockPromises.push(HangHoa.findOneAndUpdate({ maHangHoa: ma }, { $inc: { tonKho: -delta } }));
      }
    }
    hd.chiTiet = newChiTiet.map(ct => {
      const old = oldChiTiet.find(c => c.maHangHoa === ct.maHangHoa) || {};
      return { ...ct, soLuongDaTra: old.soLuongDaTra || 0, giaVon: old.giaVon || ct.giaVon || 0 };
    });
    await Promise.all([hd.save(), ...stockPromises]);
    res.json(hd);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.cancel = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    if (hd.maKhachHang && hd.conNo > 0) {
      await KhachHang.findOneAndUpdate(
        { maKhachHang: hd.maKhachHang },
        { $inc: { tongCongNo: -hd.conNo, tongMuaHang: -hd.tongThanhToan } }
      );
    }
    hd.trangThai = 'Đã huỷ';
    await hd.save();
    res.json({ message: 'Da huy hoa don' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/hoa-don/:id/force — xóa hẳn khỏi DB (admin only)
exports.deleteForce = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    // Hoàn lại công nợ khách hàng nếu có
    if (hd.maKhachHang && hd.conNo > 0) {
      await KhachHang.findOneAndUpdate(
        { maKhachHang: hd.maKhachHang },
        { $inc: { tongCongNo: -hd.conNo, tongMuaHang: -hd.tongThanhToan } }
      );
    }
    await HoaDon.deleteOne({ maHoaDon: req.params.id });
    res.json({ message: 'Đã xoá hoá đơn' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addPayment = async (req, res) => {
  try {
    const { soTien, phuongThuc } = req.body;
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    const oldNo = hd.conNo;
    hd.daThanhToan = Math.min(hd.tongThanhToan, hd.daThanhToan + Number(soTien));
    await hd.save();
    const diff = oldNo - hd.conNo;
    if (hd.maKhachHang && diff > 0) {
      await KhachHang.findOneAndUpdate({ maKhachHang: hd.maKhachHang }, { $inc: { tongCongNo: -diff } });
    }
    res.json(hd);
  } catch (err) { res.status(400).json({ message: err.message }); }
};
