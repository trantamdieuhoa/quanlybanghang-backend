const TraHang   = require('../models/TraHang');
const HoaDon    = require('../models/HoaDon');
const PhieuNhap = require('../models/PhieuNhap');
const KhachHang = require('../models/KhachHang');
const NhaCungCap= require('../models/NhaCungCap');
const HangHoa   = require('../models/HangHoa');

exports.getAll = async (req, res) => {
  try {
    const { loai, maRef, page=1, limit=50 } = req.query;
    const filter = {};
    if (loai)  filter.loai  = loai;
    if (maRef) filter.maRef = maRef;
    const skip = (page-1)*limit;
    const [data, total] = await Promise.all([
      TraHang.find(filter).sort({ ngayTraHang: -1 }).skip(skip).limit(Number(limit)),
      TraHang.countDocuments(filter),
    ]);
    res.json({ data, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const th = new TraHang({ ...req.body, nguoiTao: req.user?.username });
    await th.save();

    // Cap nhat soLuongDaTra trong hoa don / phieu nhap
    if (th.loai === 'KHACH_TRA') {
      const hd = await HoaDon.findOne({ maHoaDon: th.maRef });
      if (hd) {
        for (const item of th.chiTiet) {
          const ct = hd.chiTiet.find(c => c.maHangHoa === item.maHangHoa);
          if (ct) ct.soLuongDaTra = (ct.soLuongDaTra || 0) + item.soLuongTra;
        }
        const giamNo = Math.min(hd.conNo, th.tongTienTra);
        hd.daThanhToan = Math.min(hd.tongThanhToan, hd.daThanhToan + th.tongTienTra);
        await hd.save();
        if (hd.maKhachHang && giamNo > 0) {
          await KhachHang.findOneAndUpdate(
            { maKhachHang: hd.maKhachHang },
            { $inc: { tongCongNo: -giamNo } }
          );
        }
      }
    } else {
      const pn = await PhieuNhap.findOne({ maPhieuNhap: th.maRef });
      if (pn) {
        for (const item of th.chiTiet) {
          const ct = pn.chiTiet.find(c => c.maHangHoa === item.maHangHoa);
          if (ct) ct.soLuongDaTra = (ct.soLuongDaTra || 0) + item.soLuongTra;
        }
        const giamNo = Math.min(pn.conNo, th.tongTienTra);
        pn.daThanhToan = Math.min(pn.tongTien, pn.daThanhToan + th.tongTienTra);
        await pn.save();
        if (pn.maNhaCungCap && giamNo > 0) {
          await NhaCungCap.findOneAndUpdate(
            { maNhaCungCap: pn.maNhaCungCap },
            { $inc: { tongCongNo: -giamNo } }
          );
        }
      }
    }

    // Cap nhat ton kho:
    // KHACH_TRA  -> hang quay lai kho -> cong tonKho
    // TRA_NCC    -> hang roi kho tra NCC -> tru tonKho
    const delta = th.loai === 'KHACH_TRA' ? 1 : -1;
    await Promise.all(
      th.chiTiet.map((item) =>
        HangHoa.findOneAndUpdate(
          { maHangHoa: item.maHangHoa },
          { $inc: { tonKho: delta * item.soLuongTra } }
        )
      )
    );

    res.status(201).json(th);
  } catch (err) { res.status(400).json({ message: err.message }); }
};
