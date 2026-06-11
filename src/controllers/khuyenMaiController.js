const KhuyenMai = require('../models/KhuyenMai');

// GET /api/khuyen-mai?page=1&limit=50&trangThai=&search=
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, trangThai = '', search = '' } = req.query;
    const filter = {};
    if (trangThai) filter.trangThai = trangThai;
    if (search) filter.ten = { $regex: search, $options: 'i' };

    const [data, total] = await Promise.all([
      KhuyenMai.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      KhuyenMai.countDocuments(filter),
    ]);

    res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/khuyen-mai/active
// Trả về các khuyến mãi đang "Hoạt động" và trong thời hạn hiệu lực — dùng cho màn bán hàng
exports.getActive = async (req, res) => {
  try {
    const now = new Date();
    const data = await KhuyenMai.find({
      trangThai: 'Hoạt động',
      $and: [
        { $or: [{ ngayBatDau: null }, { ngayBatDau: { $lte: now } }] },
        { $or: [{ ngayKetThuc: null }, { ngayKetThuc: { $gte: now } }] },
      ],
    }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/khuyen-mai/:id
exports.getOne = async (req, res) => {
  try {
    const item = await KhuyenMai.findOne({ maKhuyenMai: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/khuyen-mai
exports.create = async (req, res) => {
  try {
    const item = await KhuyenMai.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/khuyen-mai/:id
exports.update = async (req, res) => {
  try {
    const item = await KhuyenMai.findOne({ maKhuyenMai: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/khuyen-mai/:id (soft delete — chuyển trạng thái Tạm dừng)
exports.remove = async (req, res) => {
  try {
    const item = await KhuyenMai.findOneAndUpdate(
      { maKhuyenMai: req.params.id },
      { trangThai: 'Tạm dừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    res.json({ message: 'Đã tạm dừng khuyến mãi', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
