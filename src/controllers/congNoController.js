const KhachHang = require('../models/KhachHang');
const NhaCungCap= require('../models/NhaCungCap');
const HoaDon    = require('../models/HoaDon');
const PhieuNhap = require('../models/PhieuNhap');

// Tổng quan công nợ
exports.summary = async (req, res) => {
  try {
    const [khachNo, nccNo] = await Promise.all([
      KhachHang.aggregate([{ $match: { tongCongNo: { $gt: 0 } } }, { $group: { _id: null, tong: { $sum: '$tongCongNo' }, soKhach: { $sum: 1 } } }]),
      NhaCungCap.aggregate([{ $match: { tongCongNo: { $gt: 0 } } }, { $group: { _id: null, tong: { $sum: '$tongCongNo' }, soNCC: { $sum: 1 } } }]),
    ]);
    res.json({
      tongNoKhach: khachNo[0]?.tong || 0,
      soKhachNo:   khachNo[0]?.soKhach || 0,
      tongNoNCC:   nccNo[0]?.tong || 0,
      soNCCNo:     nccNo[0]?.soNCC || 0,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Danh sách khách có nợ + chi tiết hóa đơn còn nợ
exports.khachNo = async (req, res) => {
  try {
    const khList = await KhachHang.find({ tongCongNo: { $gt: 0 } }).sort({ tongCongNo: -1 });
    res.json(khList);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.hoaDonNo = async (req, res) => {
  try {
    const { maKhachHang } = req.params;
    const hds = await HoaDon.find({
      maKhachHang,
      trangThaiTT: { $in: ['Còn nợ','Thanh toán một phần'] },
      trangThai: 'Hoạt động',
    }).sort({ ngayBan: -1 });
    res.json(hds);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Danh sách NCC có nợ
exports.nccNo = async (req, res) => {
  try {
    const nccList = await NhaCungCap.find({ tongCongNo: { $gt: 0 } }).sort({ tongCongNo: -1 });
    res.json(nccList);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.phieuNhapNo = async (req, res) => {
  try {
    const { maNhaCungCap } = req.params;
    const pns = await PhieuNhap.find({
      maNhaCungCap,
      trangThaiTT: { $in: ['Còn nợ','Thanh toán một phần'] },
      trangThai: 'Hoạt động',
    }).sort({ ngayNhap: -1 });
    res.json(pns);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
