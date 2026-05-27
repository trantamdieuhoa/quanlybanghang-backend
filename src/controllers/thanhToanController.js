const ThanhToan = require('../models/ThanhToan');

exports.getAll = async (req, res) => {
  try {
    const { loai, maRef, maKhachHang, maNhaCungCap, from, to, page=1, limit=50 } = req.query;
    const filter = {};
    if (loai) filter.loai = loai;
    if (maRef) filter.maRef = maRef;
    if (maKhachHang) filter.maKhachHang = maKhachHang;
    if (maNhaCungCap) filter.maNhaCungCap = maNhaCungCap;
    if (from || to) {
      filter.ngayThanhToan = {};
      if (from) filter.ngayThanhToan.$gte = new Date(from);
      if (to)   filter.ngayThanhToan.$lte = new Date(to + 'T23:59:59');
    }
    const skip = (page-1)*limit;
    const [data, total] = await Promise.all([
      ThanhToan.find(filter).sort({ ngayThanhToan: -1 }).skip(skip).limit(Number(limit)),
      ThanhToan.countDocuments(filter),
    ]);
    res.json({ data, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const tt = new ThanhToan({ ...req.body, nguoiTao: req.user?.username });
    await tt.save();
    res.status(201).json(tt);
  } catch (err) { res.status(400).json({ message: err.message }); }
};
