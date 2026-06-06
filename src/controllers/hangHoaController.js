const HangHoa = require('../models/HangHoa');

// GET /api/hang-hoa?page=1&limit=50&search=&danhMuc=&sortBy=ngayCapNhat&sortOrder=desc
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', danhMuc = '', trangThai = '',
            trangThaiKho = '', sortBy = 'ngayCapNhat', sortOrder = 'desc' } = req.query;
    const filter = {};
    if (search) filter.tenHangHoa = { $regex: search, $options: 'i' };
    if (danhMuc) filter.danhMuc = danhMuc;
    if (trangThai) filter.trangThai = trangThai;
    if (trangThaiKho === 'con') filter.tonKho = { $gt: 0 };
    else if (trangThaiKho === 'het') filter.tonKho = { $lte: 0 };

    const allowedSort = ['tenHangHoa','danhMuc','donViNhoNhat','tonKho','giaVon','ngayCapNhat'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'ngayCapNhat';
    const sortDir   = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      HangHoa.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      HangHoa.countDocuments(filter),
    ]);

    res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/hang-hoa/:id
exports.getOne = async (req, res) => {
  try {
    const item = await HangHoa.findOne({ maHangHoa: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/hang-hoa
exports.create = async (req, res) => {
  try {
    const item = await HangHoa.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã hàng hoá đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/hang-hoa/:id
exports.update = async (req, res) => {
  try {
    const item = await HangHoa.findOneAndUpdate(
      { maHangHoa: req.params.id },
      { ...req.body, ngayCapNhat: new Date() },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/hang-hoa/:id (soft delete)
exports.remove = async (req, res) => {
  try {
    const item = await HangHoa.findOneAndUpdate(
      { maHangHoa: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });
    res.json({ message: 'Đã ngừng kinh doanh hàng hoá', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
