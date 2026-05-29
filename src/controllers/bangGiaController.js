const BangGia = require('../models/BangGia');
const HangHoa = require('../models/HangHoa');

// GET /api/bang-gia?maHangHoa=HH...
exports.getAll = async (req, res) => {
  try {
    const { maHangHoa, trangThai } = req.query;
    const filter = { trangThai: trangThai || 'Hoạt động' };
    if (maHangHoa) filter.maHangHoa = maHangHoa;

    const data = await BangGia.find(filter).sort({ maHangHoa: 1, soLuongQuyDoi: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bang-gia
exports.create = async (req, res) => {
  try {
    const { maHangHoa } = req.body;
    const hangHoa = await HangHoa.findOne({ maHangHoa });
    if (!hangHoa) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });

    // Tạo maGia tự động
    const maGia = `BG${Date.now()}_${Math.floor(Math.random() * 10)}`;
    const item = await BangGia.create({
      ...req.body,
      maGia,
      tenHangHoa: hangHoa.tenHangHoa,
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã giá đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/bang-gia/:maGia
exports.update = async (req, res) => {
  try {
    const item = await BangGia.findOneAndUpdate(
      { maGia: req.params.maGia },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy bảng giá' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/bang-gia/:maGia (soft delete)
exports.remove = async (req, res) => {
  try {
    const item = await BangGia.findOneAndUpdate(
      { maGia: req.params.maGia },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy bảng giá' });
    res.json({ message: 'Đã ngừng bảng giá', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
