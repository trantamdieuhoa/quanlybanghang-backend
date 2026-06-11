const PhieuKiemKe = require('../models/PhieuKiemKe');
const HangHoa     = require('../models/HangHoa');

// GET /api/phieu-kiem-ke?page=1&limit=20&trangThai=
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, trangThai = '' } = req.query;
    const filter = {};
    if (trangThai) filter.trangThai = trangThai;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      PhieuKiemKe.find(filter).sort({ ngayKiemKe: -1 }).skip(skip).limit(Number(limit)).select('-chiTiet'),
      PhieuKiemKe.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/phieu-kiem-ke/:id
exports.getOne = async (req, res) => {
  try {
    const pkk = await PhieuKiemKe.findOne({ maPhieuKiemKe: req.params.id });
    if (!pkk) return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kê' });
    res.json(pkk);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/phieu-kiem-ke
// body: { ghiChu, chiTiet: [{ maHangHoa, tonKhoThucTe, ghiChu }] }
exports.create = async (req, res) => {
  try {
    const { chiTiet = [], ghiChu = '' } = req.body;
    if (!Array.isArray(chiTiet) || chiTiet.length === 0) {
      return res.status(400).json({ message: 'Phiếu kiểm kê chưa có sản phẩm nào' });
    }

    const maList = chiTiet.map((c) => c.maHangHoa);
    const hangHoas = await HangHoa.find({ maHangHoa: { $in: maList } })
      .select('maHangHoa tenHangHoa donViNhoNhat tonKho giaVon');
    const map = Object.fromEntries(hangHoas.map((h) => [h.maHangHoa, h]));

    const ctList = chiTiet.map((c) => {
      const hh = map[c.maHangHoa];
      const tonHeThong = hh ? hh.tonKho : 0;
      const tonThucTe  = Number(c.tonKhoThucTe) || 0;
      return {
        maHangHoa: c.maHangHoa,
        tenHangHoa: hh ? hh.tenHangHoa : (c.tenHangHoa || ''),
        donVi: hh ? hh.donViNhoNhat : (c.donVi || ''),
        tonKhoHeThong: tonHeThong,
        tonKhoThucTe: tonThucTe,
        chenhLech: tonThucTe - tonHeThong,
        giaVon: hh ? hh.giaVon : 0,
        ghiChu: c.ghiChu || '',
      };
    });

    const pkk = new PhieuKiemKe({ chiTiet: ctList, ghiChu, nguoiTao: req.user?.username });
    await pkk.save();
    res.status(201).json(pkk);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// POST /api/phieu-kiem-ke/:id/ap-dung
// Ghi đè tonKho HangHoa theo số liệu kiểm kê thực tế, tạo chênh lệch tồn kho
exports.apDung = async (req, res) => {
  try {
    const pkk = await PhieuKiemKe.findOne({ maPhieuKiemKe: req.params.id });
    if (!pkk) return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kê' });
    if (pkk.trangThai === 'Đã áp dụng') {
      return res.status(400).json({ message: 'Phiếu kiểm kê đã được áp dụng trước đó' });
    }

    for (const ct of pkk.chiTiet) {
      if (ct.chenhLech === 0) continue;
      const hh = await HangHoa.findOne({ maHangHoa: ct.maHangHoa });
      if (!hh) continue;
      hh.tonKho = ct.tonKhoThucTe;
      if (hh.tonKho <= 0) hh.coHang = false;
      await hh.save();
    }

    pkk.trangThai = 'Đã áp dụng';
    await pkk.save();
    res.json(pkk);
  } catch (err) { res.status(400).json({ message: err.message }); }
};
