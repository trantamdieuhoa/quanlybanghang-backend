const BienThe = require('../models/BienThe');
const HangHoa = require('../models/HangHoa');
const { normalizeDsMaVach, collectAllMaVach, findTrungMaVach, trungMaVachMessage } = require('../utils/maVachUtils');

// Đồng bộ HangHoa.tonKho = tổng tonKho của các biến thể — gọi sau mỗi thay đổi BienThe
// hoặc khi bán/nhập hàng theo biến thể (dùng ở hoaDonController/phieuNhapController)
exports.syncTonKho = async (maHangHoa) => {
  const list = await BienThe.find({ maHangHoa }).select('tonKho');
  const tongTonKho = list.reduce((sum, bt) => sum + (bt.tonKho || 0), 0);
  await HangHoa.findOneAndUpdate({ maHangHoa }, { tonKho: tongTonKho });
  return tongTonKho;
};

// GET /api/bien-the?maHangHoa=XXX
exports.getAll = async (req, res) => {
  try {
    const { maHangHoa = '' } = req.query;
    const filter = {};
    if (maHangHoa) filter.maHangHoa = maHangHoa;
    const data = await BienThe.find(filter).sort({ createdAt: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/bien-the/:id
exports.getOne = async (req, res) => {
  try {
    const item = await BienThe.findOne({ maBienThe: req.params.id });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy biến thể' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bien-the
exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.maVach) delete body.maVach; // tránh vi phạm sparse unique index
    if ('dsMaVach' in body) body.dsMaVach = normalizeDsMaVach(body.dsMaVach);

    // 1 mã vạch chỉ thuộc 1 mặt hàng/biến thể — kiểm tra trùng toàn hệ thống
    const allMaVach = collectAllMaVach(body.maVach, body.dsMaVach);
    const trung = await findTrungMaVach(allMaVach);
    if (trung) return res.status(400).json({ message: trungMaVachMessage(trung) });

    const item = await BienThe.create(body);
    await exports.syncTonKho(item.maHangHoa);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      const msg = err.keyPattern?.maVach ? 'Mã vạch đã tồn tại' : 'Mã biến thể đã tồn tại';
      return res.status(400).json({ message: msg });
    }
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/bien-the/:id
exports.update = async (req, res) => {
  try {
    const body = { ...req.body };
    if ('dsMaVach' in body) body.dsMaVach = normalizeDsMaVach(body.dsMaVach);

    // 1 mã vạch chỉ thuộc 1 mặt hàng/biến thể — kiểm tra trùng toàn hệ thống
    if ('maVach' in body || 'dsMaVach' in body) {
      const existing = await BienThe.findOne({ maBienThe: req.params.id }).select('maVach dsMaVach').lean();
      const maVach = 'maVach' in body ? body.maVach : existing?.maVach;
      const dsMaVach = 'dsMaVach' in body ? body.dsMaVach : existing?.dsMaVach;
      const allMaVach = collectAllMaVach(maVach, dsMaVach);
      const trung = await findTrungMaVach(allMaVach, { excludeMaBienThe: req.params.id });
      if (trung) return res.status(400).json({ message: trungMaVachMessage(trung) });
    }

    const update = { $set: body };
    if ('maVach' in body && !body.maVach) {
      delete body.maVach;
      update.$unset = { maVach: '' };
    }
    const item = await BienThe.findOneAndUpdate(
      { maBienThe: req.params.id },
      update,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy biến thể' });
    await exports.syncTonKho(item.maHangHoa);
    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      const msg = err.keyPattern?.maVach ? 'Mã vạch đã tồn tại' : 'Mã biến thể đã tồn tại';
      return res.status(400).json({ message: msg });
    }
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/bien-the/:id (soft delete — chuyển trạng thái Ngừng)
exports.remove = async (req, res) => {
  try {
    const item = await BienThe.findOneAndUpdate(
      { maBienThe: req.params.id },
      { trangThai: 'Ngừng' },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Không tìm thấy biến thể' });
    res.json({ message: 'Đã ngừng biến thể', item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
