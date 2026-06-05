const NhaCungCap = require('../models/NhaCungCap');

exports.getAll = async (req, res) => {
  try {
    const { search = '', all = '' } = req.query;
    // all=1: trả tất cả (kể cả Ngừng) — dùng cho form chọn NCC của hàng hoá
    const filter = all === '1' ? {} : { trangThai: 'Hoạt động' };
    if (search) filter.$or = [
      { tenNhaCungCap: { $regex: search, $options: 'i' } },
      { tenNCC:        { $regex: search, $options: 'i' } },
      { soDienThoai:   { $regex: search, $options: 'i' } },
    ];
    const data = await NhaCungCap.find(filter).sort({ tenNCC: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { maNCC } = req.body;
    if (!maNCC) {
      req.body.maNCC = `NCC${Date.now()}`;
    }
    const item = await NhaCungCap.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã nhà cung cấp đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await NhaCungCap.findOneAndUpdate(
      { maNCC: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await NhaCungCap.findOneAndUpdate(
      { maNCC: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    res.json({ message: 'Đã xoá nhà cung cấp', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
