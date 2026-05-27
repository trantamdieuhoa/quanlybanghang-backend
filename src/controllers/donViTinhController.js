const DonViTinh = require('../models/DonViTinh');

exports.getAll = async (req, res) => {
  try {
    const data = await DonViTinh.find({ trangThai: 'Hoạt động' }).sort({ tenDonVi: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const item = await DonViTinh.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Đơn vị đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await DonViTinh.findOneAndUpdate(
      { tenDonVi: req.params.id },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy đơn vị tính' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await DonViTinh.findOneAndUpdate({ tenDonVi: req.params.id }, { trangThai: 'Ngừng' });
    res.json({ message: 'Đã xoá đơn vị tính' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
