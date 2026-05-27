const HangHoa = require('../models/HangHoa');

// GET /api/hang-hoa?page=1&limit=20&search=&danhMuc=
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', danhMuc = '', trangThai = '' } = req.query;
    const filter = {};
    if (search) filter.tenHangHoa = { $regex: search, $options: 'i' };
    if (danhMuc) filter.danhMuc = danhMuc;
    if (trangThai) filter.trangThai = trangThai;

    const [data, total] = await Promise.all([
      HangHoa.find(filter)
        .populate('nhaCungCap', 'tenNCC')
        .sort({ ngayCapNhat: -1 })
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
    const item = await HangHoa.findOne({ maHangHoa: req.params.id }).populate('nhaCungCap', 'tenNCC maNCC');
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
