const PhieuNhap  = require('../models/PhieuNhap');
const NhaCungCap = require('../models/NhaCungCap');
const HangHoa    = require('../models/HangHoa');
const BienThe    = require('../models/BienThe');
const { syncTonKho } = require('./bienTheController');

// Chuẩn hoá về 00:00:00 UTC của ngày — dùng để gộp lô cùng ngày HSD
const normalizeDate = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

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
    const affectedBienTheHH = new Set();
    for (const ct of pn.chiTiet) {
      if (ct.maBienThe) {
        // Biến thể (size/màu...) — cộng tonKho + giaVon trên BienThe, đồng bộ lại HangHoa.tonKho sau
        const btUpdate = { $inc: { tonKho: ct.soLuong } };
        if (ct.donGia > 0) btUpdate.$set = { giaVon: ct.donGia };
        promises.push(BienThe.findOneAndUpdate({ maBienThe: ct.maBienThe }, btUpdate));
        affectedBienTheHH.add(ct.maHangHoa);
      } else {
        const update = { $inc: { tonKho: ct.soLuong } };
        // Cập nhật giá vốn theo giá nhập mới nhất
        if (ct.donGia > 0) update.$set = { giaVon: ct.donGia };
        promises.push(HangHoa.findOneAndUpdate({ maHangHoa: ct.maHangHoa }, update));
      }

      // Lô hàng theo HSD (optional) — gộp vào lô cùng ngày HSD nếu đã có, ngược lại tạo lô mới
      if (ct.hanSuDung) {
        const hsd = normalizeDate(ct.hanSuDung);
        promises.push((async () => {
          const merged = await HangHoa.findOneAndUpdate(
            { maHangHoa: ct.maHangHoa, 'lo.hanSuDung': hsd },
            { $inc: { 'lo.$.soLuong': ct.soLuong } }
          );
          if (!merged) {
            await HangHoa.findOneAndUpdate(
              { maHangHoa: ct.maHangHoa },
              { $push: { lo: { hanSuDung: hsd, soLuong: ct.soLuong, ngayNhap: new Date(), maPhieuNhap: pn.maPhieuNhap } } }
            );
          }
        })());
      }
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
    for (const maHangHoa of affectedBienTheHH) await syncTonKho(maHangHoa);

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
