const DanhMuc = require('../models/DanhMuc');

exports.getAll = async (req, res) => {
  try {
    const data = await DanhMuc.find({ trangThai: 'Hoạt động' }).sort({ tenDanhMuc: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const item = await DanhMuc.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã danh mục đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await DanhMuc.findOneAndUpdate(
      { maDanhMuc: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await DanhMuc.findOneAndUpdate(
      { maDanhMuc: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json({ message: 'Đã xoá danh mục', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
