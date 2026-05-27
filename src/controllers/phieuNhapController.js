const PhieuNhap  = require('../models/PhieuNhap');
const NhaCungCap = require('../models/NhaCungCap');
const HangHoa    = require('../models/HangHoa');

exports.getAll = async (req, res) => {
  try {
    const { search='', maNhaCungCap, trangThaiTT, from, to, page=1, limit=50 } = req.query;
    const filter = { trangThai: 'Hoạt động' };
    if (search) filter.$or = [
      { maPhieuNhap: new RegExp(search,'i') },
      { tenNhaCungCap: new RegExp(search,'i') },
    ];
    if (maNhaCungCap) filter.maNhaCungCap = maNhaCungCap;
    if (trangThaiTT) filter.trangThaiTT = trangThaiTT;
    if (from || to) {
      filter.ngayNhap = {};
      if (from) filter.ngayNhap.$gte = new Date(from);
      if (to)   filter.ngayNhap.$lte = new Date(to + 'T23:59:59');
    }
    const skip = (page-1)*limit;
    const [data, total] = await Promise.all([
      PhieuNhap.find(filter).sort({ ngayNhap: -1 }).skip(skip).limit(Number(limit)).select('-chiTiet'),
      PhieuNhap.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const pn = await PhieuNhap.findOne({ maPhieuNhap: req.params.id });
    if (!pn) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    res.json(pn);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const pn = new PhieuNhap({ ...req.body, nguoiTao: req.user?.username });
    await pn.save();

    const promises = [];
    for (const ct of pn.chiTiet) {
      promises.push(
        HangHoa.findOneAndUpdate(
          { maHangHoa: ct.maHangHoa },
          { $inc: { tonKho: ct.soLuong } }
        )
      );
    }
    if (pn.maNhaCungCap && pn.conNo > 0) {
      promises.push(
        NhaCungCap.findOneAndUpdate(
          { maNhaCungCap: pn.maNhaCungCap },
          { $inc: { tongCongNo: pn.conNo } }
        )
      );
    }
    await Promise.all(promises);

    res.status(201).json(pn);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const old = await PhieuNhap.findOne({ maPhieuNhap: req.params.id });
    if (!old) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    Object.assign(old, req.body);
    await old.save();
    res.json(old);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.addPayment = async (req, res) => {
  try {
    const { soTien } = req.body;
    const pn = await PhieuNhap.findOne({ maPhieuNhap: req.params.id });
    if (!pn) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    const oldNo = pn.conNo;
    pn.daThanhToan = Math.min(pn.tongTien, pn.daThanhToan + Number(soTien));
    await pn.save();
    const diff = oldNo - pn.conNo;
    if (pn.maNhaCungCap && diff > 0) {
      await NhaCungCap.findOneAndUpdate(
        { maNhaCungCap: pn.maNhaCungCap },
        { $inc: { tongCongNo: -diff } }
      );
    }
    res.json(pn);
  } catch (err) { res.status(400).json({ message: err.message }); }
};
