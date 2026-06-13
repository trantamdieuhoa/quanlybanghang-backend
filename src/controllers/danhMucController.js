const DanhMuc  = require('../models/DanhMuc');
const HangHoa  = require('../models/HangHoa');

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
    const oldItem = await DanhMuc.findOne({ maDanhMuc: req.params.id });
    if (!oldItem) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    const oldTen = oldItem.tenDanhMuc;

    const item = await DanhMuc.findOneAndUpdate(
      { maDanhMuc: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    // Đổi tên danh mục → cập nhật lại danhMuc (chuỗi tên, không phải ref) cho tất cả HangHoa đang dùng tên cũ.
    // Set thêm ngayCapNhat = now để Sheets import (guard theo lastExportAt) không
    // ghi đè lại tên danh mục cũ từ Sheet HangHoa chưa kịp export.
    if (item.tenDanhMuc !== oldTen) {
      await HangHoa.updateMany(
        { danhMuc: oldTen },
        { $set: { danhMuc: item.tenDanhMuc, ngayCapNhat: new Date() } }
      );
    }

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
    // Reset danhMuc về rỗng cho tất cả hàng hoá đang dùng danh mục này
    await HangHoa.updateMany(
      { danhMuc: item.tenDanhMuc },
      { $set: { danhMuc: '' } }
    );
    res.json({ message: 'Đã xoá danh mục', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
