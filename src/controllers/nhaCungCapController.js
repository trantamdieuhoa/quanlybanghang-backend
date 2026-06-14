const NhaCungCap = require('../models/NhaCungCap');
const { removeDiacritics, buildSearchFilter, escapeRegex } = require('../utils/searchUtils');

exports.getAll = async (req, res) => {
  try {
    const { search = '', all = '' } = req.query;
    // all=1: trả tất cả (kể cả Ngừng) — dùng cho form chọn NCC của hàng hoá
    const filter = all === '1' ? {} : { trangThai: 'Hoạt động' };
    if (search) {
      const tenFilter = buildSearchFilter(search, ['tenKhongDau']);
      const sdtFilter = { soDienThoai: { $regex: escapeRegex(search), $options: 'i' } };
      filter.$or = [sdtFilter, ...(tenFilter ? [tenFilter] : [])];
    }
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
    const body = { ...req.body };
    // Không cho client tự gửi tenKhongDau — luôn tính lại từ tenNhaCungCap/tenNCC
    delete body.tenKhongDau;
    // findOneAndUpdate không chạy pre('save') — tự tính lại tenKhongDau khi đổi tên
    if ('tenNhaCungCap' in body || 'tenNCC' in body) {
      body.tenKhongDau = removeDiacritics(body.tenNhaCungCap || body.tenNCC);
    }
    const item = await NhaCungCap.findOneAndUpdate(
      { maNhaCungCap: req.params.id },
      body,
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
      { maNhaCungCap: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    res.json({ message: 'Đã xoá nhà cung cấp', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
