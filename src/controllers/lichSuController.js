const HoaDon   = require('../models/HoaDon');
const PhieuNhap = require('../models/PhieuNhap');
const TraHang  = require('../models/TraHang');

/**
 * GET /api/lich-su
 * Query: type (hoa-don | phieu-nhap | tra-hang), page, limit
 * Trả về activity feed tổng hợp từ các collection, sắp xếp theo ngày mới nhất.
 */
exports.getActivity = async (req, res) => {
  try {
    const { type, page = 1, limit = 40 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const CAP   = 200; // mỗi collection lấy tối đa N bản ghi để merge

    const results = [];

    if (!type || type === 'hoa-don') {
      const docs = await HoaDon.find({})
        .sort({ createdAt: -1 })
        .limit(CAP)
        .select('maHoaDon tenKhachHang tongThanhToan trangThaiTT trangThai ngayBan createdAt')
        .lean();
      docs.forEach((h) => results.push({
        loai:       'HOA_DON',
        ma:         h.maHoaDon,
        tenDoiTac:  h.tenKhachHang || 'Khach le',
        soTien:     h.tongThanhToan || 0,
        trangThai:  h.trangThaiTT || '',
        moTa:       h.trangThai === 'Da huy' ? 'Da huy' : '',
        ngay:       h.ngayBan || h.createdAt,
      }));
    }

    if (!type || type === 'phieu-nhap') {
      const docs = await PhieuNhap.find({})
        .sort({ createdAt: -1 })
        .limit(CAP)
        .select('maPhieuNhap tenNhaCungCap tongTienNhap trangThai ngayNhap createdAt')
        .lean();
      docs.forEach((p) => results.push({
        loai:      'PHIEU_NHAP',
        ma:        p.maPhieuNhap,
        tenDoiTac: p.tenNhaCungCap || '',
        soTien:    p.tongTienNhap || 0,
        trangThai: p.trangThai || '',
        moTa:      '',
        ngay:      p.ngayNhap || p.createdAt,
      }));
    }

    if (!type || type === 'tra-hang') {
      const docs = await TraHang.find({})
        .sort({ createdAt: -1 })
        .limit(CAP)
        .select('maTraHang loai tenKhachHang tenNhaCungCap tongTienTra ghiChu ngayTraHang createdAt')
        .lean();
      docs.forEach((t) => results.push({
        loai:      t.loai,          // KHACH_TRA | TRA_NCC
        ma:        t.maTraHang,
        tenDoiTac: t.loai === 'KHACH_TRA' ? (t.tenKhachHang || '') : (t.tenNhaCungCap || ''),
        soTien:    t.tongTienTra || 0,
        trangThai: 'Tra hang',
        moTa:      t.ghiChu || '',
        ngay:      t.ngayTraHang || t.createdAt,
      }));
    }

    // Sort mới nhất lên đầu
    results.sort((a, b) => new Date(b.ngay) - new Date(a.ngay));

    const total = results.length;
    const data  = results.slice(skip, skip + Number(limit));

    res.json({ data, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
