const Combo = require('../models/Combo');
const HangHoa = require('../models/HangHoa');
const { buildSearchFilter } = require('../utils/searchUtils');

// GET /api/combo?page=1&limit=50&trangThai=&search=
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, trangThai = '', search = '' } = req.query;
    const filter = {};
    if (trangThai) filter.trangThai = trangThai;
    if (search) {
      const tenFilter = buildSearchFilter(search, ['tenKhongDau']);
      if (tenFilter) Object.assign(filter, tenFilter);
    }

    const [data, total] = await Promise.all([
      Combo.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Combo.countDocuments(filter),
    ]);

    res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/combo/active — combo đang "Hoạt động", dùng cho màn bán hàng
// Đính kèm tonKho hiện tại của từng thành phần (không lưu DB) để Flutter validate tồn kho
exports.getActive = async (req, res) => {
  try {
    const combos = await Combo.find({ trangThai: 'Hoạt động' }).sort({ createdAt: -1 }).lean();

    const maCodes = new Set();
    combos.forEach((c) => (c.thanhPhan || []).forEach((tp) => maCodes.add(tp.maHangHoa)));
    const hangHoas = await HangHoa.find({ maHangHoa: { $in: [...maCodes] } })
      .select('maHangHoa tonKho').lean();
    const tonKhoMap = Object.fromEntries(hangHoas.map((h) => [h.maHangHoa, h.tonKho || 0]));

    const data = combos.map((c) => ({
      ...c,
      thanhPhan: (c.thanhPhan || []).map((tp) => ({ ...tp, tonKho: tonKhoMap[tp.maHangHoa] ?? 0 })),
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/combo/:id
exports.getOne = async (req, res) => {
  try {
    const item = await Combo.findOne({ maCombo: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy combo' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/combo
exports.create = async (req, res) => {
  try {
    const item = await Combo.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã combo đã tồn tại' });
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/combo/:id
exports.update = async (req, res) => {
  try {
    const item = await Combo.findOne({ maCombo: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy combo' });
    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/combo/:id (soft delete — chuyển trạng thái Ngừng)
exports.remove = async (req, res) => {
  try {
    const item = await Combo.findOneAndUpdate(
      { maCombo: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy combo' });
    res.json({ message: 'Đã ngừng combo', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
