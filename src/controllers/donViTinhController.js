const DonViTinh = require('../models/DonViTinh');
const HangHoa   = require('../models/HangHoa');

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
    const oldItem = await DonViTinh.findOne({ tenDonVi: req.params.id });
    if (!oldItem) return res.status(404).json({ message: 'Không tìm thấy đơn vị tính' });
    const oldTen = oldItem.tenDonVi;

    const item = await DonViTinh.findOneAndUpdate(
      { tenDonVi: req.params.id },
      req.body,
      { new: true }
    );

    // Đổi tên đơn vị → cập nhật donViNhoNhat (chuỗi tên, không phải ref) cho tất cả HangHoa đang dùng tên cũ.
    // Set thêm ngayCapNhat = now để Sheets import (guard theo lastExportAt) không
    // ghi đè lại tên đơn vị cũ từ Sheet HangHoa chưa kịp export.
    if (item.tenDonVi !== oldTen) {
      await HangHoa.updateMany(
        { donViNhoNhat: oldTen },
        { $set: { donViNhoNhat: item.tenDonVi, ngayCapNhat: new Date() } }
      );
    }

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
