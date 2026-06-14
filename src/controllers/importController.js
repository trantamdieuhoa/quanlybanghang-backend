const XLSX = require('xlsx');
const HangHoa = require('../models/HangHoa');
const BangGia = require('../models/BangGia');
const DanhMuc = require('../models/DanhMuc');
const DonViTinh = require('../models/DonViTinh');
const { removeDiacritics } = require('../utils/searchUtils');

/**
 * POST /api/import/excel
 * Upload file Excel có cấu trúc giống file mẫu:
 *   Sheet HangHoa, BangGiaChiTiet, DanhMuc, DonViTinh
 */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng upload file Excel (.xlsx)' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const result = { danhMuc: 0, donViTinh: 0, hangHoa: 0, bangGia: 0, errors: [] };

    // ── DanhMuc ──────────────────────────────────────────────────────────────
    if (wb.SheetNames.includes('DanhMuc')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['DanhMuc'], { header: 1, defval: '' });
      for (let i = 1; i < rows.length; i++) {
        const [maDanhMuc, tenDanhMuc, moTa] = rows[i];
        if (!maDanhMuc || !tenDanhMuc) continue;
        try {
          await DanhMuc.findOneAndUpdate(
            { maDanhMuc: String(maDanhMuc).trim() },
            { tenDanhMuc: String(tenDanhMuc).trim(), moTa: String(moTa || '').trim() },
            { upsert: true }
          );
          result.danhMuc++;
        } catch (e) { result.errors.push(`DanhMuc dòng ${i + 1}: ${e.message}`); }
      }
    }

    // ── DonViTinh ─────────────────────────────────────────────────────────────
    if (wb.SheetNames.includes('DonViTinh')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['DonViTinh'], { header: 1, defval: '' });
      for (let i = 1; i < rows.length; i++) {
        const [tenDonVi, ghiChu] = rows[i];
        if (!tenDonVi) continue;
        try {
          await DonViTinh.findOneAndUpdate(
            { tenDonVi: String(tenDonVi).trim() },
            { ghiChu: String(ghiChu || '').trim() },
            { upsert: true }
          );
          result.donViTinh++;
        } catch (e) { result.errors.push(`DonViTinh dòng ${i + 1}: ${e.message}`); }
      }
    }

    // ── HangHoa ───────────────────────────────────────────────────────────────
    if (wb.SheetNames.includes('HangHoa')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['HangHoa'], { header: 1, defval: '' });
      for (let i = 1; i < rows.length; i++) {
        const [maHangHoa, tenHangHoa, donViNhoNhat, danhMuc, , ghiChu, trangThai, , giaVon] = rows[i];
        if (!maHangHoa || !tenHangHoa) continue;
        try {
          await HangHoa.findOneAndUpdate(
            { maHangHoa: String(maHangHoa).trim() },
            {
              tenHangHoa: String(tenHangHoa).trim(),
              // findOneAndUpdate không chạy pre('save') — tự tính tenKhongDau để search hoạt động
              tenKhongDau: removeDiacritics(String(tenHangHoa).trim()),
              donViNhoNhat: String(donViNhoNhat || '').trim(),
              danhMuc: String(danhMuc || '').trim(),
              ghiChu: String(ghiChu || '').trim(),
              trangThai: String(trangThai || 'Hoạt động').trim(),
              giaVon: Number(giaVon) || 0,
              ngayCapNhat: new Date(),
            },
            { upsert: true }
          );
          result.hangHoa++;
        } catch (e) { result.errors.push(`HangHoa dòng ${i + 1}: ${e.message}`); }
      }
    }

    // ── BangGiaChiTiet ────────────────────────────────────────────────────────
    if (wb.SheetNames.includes('BangGiaChiTiet')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['BangGiaChiTiet'], { header: 1, defval: '' });
      for (let i = 1; i < rows.length; i++) {
        const [maGia, maHangHoa, tenHangHoa, quyCachBan, soLuongQuyDoi, donViQuyCach, giaBan, , ghiChu, trangThai] = rows[i];
        if (!maGia || !maHangHoa) continue;
        try {
          const sl = Number(soLuongQuyDoi) || 1;
          const gia = Number(giaBan) || 0;
          await BangGia.findOneAndUpdate(
            { maGia: String(maGia).trim() },
            {
              maHangHoa: String(maHangHoa).trim(),
              tenHangHoa: String(tenHangHoa || '').trim(),
              quyCachBan: String(quyCachBan || '').trim(),
              soLuongQuyDoi: sl,
              donViQuyCach: String(donViQuyCach || '').trim(),
              giaBan: gia,
              giaTrenDonViNhoNhat: sl > 0 ? gia / sl : 0,
              ghiChu: String(ghiChu || '').trim(),
              trangThai: String(trangThai || 'Hoạt động').trim(),
            },
            { upsert: true }
          );
          result.bangGia++;
        } catch (e) { result.errors.push(`BangGia dòng ${i + 1}: ${e.message}`); }
      }
    }

    res.json({ message: 'Import hoàn tất', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
