const KhachHang = require('../models/KhachHang');
const { removeDiacritics, buildSearchFilter, escapeRegex } = require('../utils/searchUtils');

exports.getAll = async (req, res) => {
  try {
    const { search = '', trangThai, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (search) {
      const tenFilter = buildSearchFilter(search, ['tenKhongDau']);
      const sdtFilter = { soDienThoai: { $regex: escapeRegex(search), $options: 'i' } };
      filter.$or = [sdtFilter, ...(tenFilter ? [tenFilter] : [])];
    }
    if (trangThai) filter.trangThai = trangThai;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      KhachHang.find(filter).sort({ tenKhachHang: 1 }).skip(skip).limit(Number(limit)),
      KhachHang.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const kh = await KhachHang.findOne({ maKhachHang: req.params.id });
    if (!kh) return res.status(404).json({ message: 'Khong tim thay khach hang' });
    res.json(kh);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const kh = new KhachHang(req.body);
    await kh.save();
    res.status(201).json(kh);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const body = { ...req.body };
    // Không cho client tự gửi tenKhongDau — luôn tính lại từ tenKhachHang
    delete body.tenKhongDau;
    // findOneAndUpdate không chạy pre('save') — tự tính lại tenKhongDau khi đổi tên
    if ('tenKhachHang' in body) body.tenKhongDau = removeDiacritics(body.tenKhachHang);
    const kh = await KhachHang.findOneAndUpdate(
      { maKhachHang: req.params.id },
      body,
      { new: true }
    );
    if (!kh) return res.status(404).json({ message: 'Khong tim thay khach hang' });
    res.json(kh);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await KhachHang.findOneAndUpdate(
      { maKhachHang: req.params.id },
      { trangThai: 'Ngung' }
    );
    res.json({ message: 'Da xoa' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/khach-hang/:id/hoa-don
exports.getHoaDon = async (req, res) => {
  try {
    const HoaDon = require('../models/HoaDon');
    const { page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;
    const filter = { maKhachHang: req.params.id };
    const [data, total] = await Promise.all([
      HoaDon.find(filter).sort({ ngayBan: -1 }).skip(skip).limit(Number(limit)).lean(),
      HoaDon.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/khach-hang/:id/tra-hang
exports.getTraHang = async (req, res) => {
  try {
    const TraHang = require('../models/TraHang');
    const { page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;
    const filter = { maKhachHang: req.params.id, loai: 'KHACH_TRA' };
    const [data, total] = await Promise.all([
      TraHang.find(filter).sort({ ngayTraHang: -1 }).skip(skip).limit(Number(limit)).lean(),
      TraHang.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
