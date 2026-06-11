const HangHoa = require('../models/HangHoa');

// GET /api/hang-hoa?page=1&limit=50&search=&danhMuc=&sortBy=ngayCapNhat&sortOrder=desc
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', danhMuc = '', trangThai = '',
            trangThaiKho = '', sortBy = 'ngayCapNhat', sortOrder = 'desc' } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { tenHangHoa: { $regex: search, $options: 'i' } },
        { maVach: { $regex: search, $options: 'i' } },
      ];
    }
    if (danhMuc) filter.danhMuc = danhMuc;
    if (trangThai) filter.trangThai = trangThai;
    // Hàng cũ chưa có field coHang (null) → coi là còn hàng
    if (trangThaiKho === 'con') filter.coHang = { $ne: false };
    else if (trangThaiKho === 'het') filter.coHang = false;

    const allowedSort = ['tenHangHoa','danhMuc','donViNhoNhat','tonKho','giaVon','ngayCapNhat'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'ngayCapNhat';
    const sortDir   = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      HangHoa.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      HangHoa.countDocuments(filter),
    ]);

    res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/hang-hoa/:id
exports.getOne = async (req, res) => {
  try {
    const item = await HangHoa.findOne({ maHangHoa: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/hang-hoa
exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    // maVach rỗng → bỏ field để không vi phạm sparse unique index
    if (!body.maVach) delete body.maVach;
    const item = await HangHoa.create(body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      const msg = err.keyPattern?.maVach ? 'Mã vạch đã tồn tại' : 'Mã hàng hoá đã tồn tại';
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/hang-hoa/:id
exports.update = async (req, res) => {
  try {
    const body = { ...req.body, ngayCapNhat: new Date() };
    const update = { $set: body };
    // maVach rỗng → $unset để không vi phạm sparse unique index
    if ('maVach' in body && !body.maVach) {
      delete body.maVach;
      update.$unset = { maVach: '' };
    }
    const item = await HangHoa.findOneAndUpdate(
      { maHangHoa: req.params.id },
      update,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });
    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      const msg = err.keyPattern?.maVach ? 'Mã vạch đã tồn tại' : 'Mã hàng hoá đã tồn tại';
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/hang-hoa/barcode/:maVach — tra cứu nhanh khi bán hàng (scan mã vạch)
exports.getByBarcode = async (req, res) => {
  try {
    const item = await HangHoa.findOne({ maVach: req.params.maVach, trangThai: 'Hoạt động' });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá với mã vạch này' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/hang-hoa/:id (soft delete)
exports.remove = async (req, res) => {
  try {
    const item = await HangHoa.findOneAndUpdate(
      { maHangHoa: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy hàng hoá' });
    res.json({ message: 'Đã ngừng kinh doanh hàng hoá', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
