/**
 * sheetsSync.js
 * Đồng bộ dữ liệu giữa MongoDB và Google Sheets.
 *
 * QUY ƯỚC GIÁ:
 *   - Google Sheets lưu giá theo đơn vị NGHÌN ĐỒNG (ví dụ: 7 = 7.000đ, 400 = 400.000đ)
 *   - MongoDB lưu giá theo đơn vị ĐỒNG (7000, 400000)
 *   → Import Sheets→MongoDB: nhân ×1000
 *   → Export MongoDB→Sheets: chia ÷1000
 *
 * Cấu trúc Sheets phải khớp file mẫu:
 *   - Sheet "HangHoa"        : ID | Tên | ĐVT nhỏ nhất | Danh mục | NCC | Ghi chú | Trạng thái | Ngày | Giá nhập(nghìn) | Còn hàng
 *   - Sheet "BangGiaChiTiet" : ID giá | ID hàng | Tên hàng | Quy cách | Số lượng | Đơn vị | Giá bán(nghìn) | Giá/đvt | Ghi chú | Trạng thái
 *   - Sheet "DanhMuc"        : ID | Tên | Mô tả
 *   - Sheet "DonViTinh"      : Đơn vị tính | Ghi chú
 */

const cron = require('node-cron');
const { getSheets, SHEET_ID } = require('../config/sheets');
const HangHoa = require('../models/HangHoa');
const BangGia = require('../models/BangGia');
const DanhMuc = require('../models/DanhMuc');
const DonViTinh = require('../models/DonViTinh');

// ─── Helper ────────────────────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
};

// Sheets lưu nghìn đồng → chuyển về đồng
const fromSheets = (val) => Math.round((Number(val) || 0) * 1000);

// MongoDB lưu đồng → chuyển về nghìn đồng cho Sheets
const toSheets = (val) => {
  const v = Number(val) || 0;
  // Nếu đã là đơn vị nghìn (nhỏ hơn 1000) thì không chia
  return v >= 1000 ? v / 1000 : v;
};

const clearAndWrite = async (sheets, sheetId, sheetName, rows) => {
  // Không xoá khi không có dữ liệu — tránh mất sheet khi DB rỗng
  if (rows.length === 0) {
    console.warn(`[Sheets] ${sheetName}: 0 rows — bỏ qua để tránh xoá sheet`);
    return;
  }
  // Chuẩn bị xong mới xoá → ghi, giảm rủi ro mất dữ liệu
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
};

// ─── Export MongoDB → Sheets ───────────────────────────────────────────────────

const exportHangHoa = async (sheets, sheetId) => {
  const data = await HangHoa.find().lean();
  const rows = data.map((h) => [
    h.maHangHoa,
    h.tenHangHoa,
    h.donViNhoNhat || '',
    h.danhMuc || '',
    Array.isArray(h.nhaCungCap) ? h.nhaCungCap.join(', ') : (h.nhaCungCap || ''),
    h.ghiChu || '',
    h.trangThai,
    formatDate(h.ngayCapNhat),
    toSheets(h.giaVon),          // đồng → nghìn đồng
    h.coHang !== false ? 'true' : 'false', // còn hàng / hết hàng
  ]);
  await clearAndWrite(sheets, sheetId, 'HangHoa', rows);
  return rows.length;
};

const exportBangGia = async (sheets, sheetId) => {
  const data = await BangGia.find().lean();
  const rows = data.map((b) => [
    b.maGia,
    b.maHangHoa,
    b.tenHangHoa || '',
    b.quyCachBan,
    b.soLuongQuyDoi,
    b.donViQuyCach,
    toSheets(b.giaBan),                    // đồng → nghìn đồng
    toSheets(b.giaTrenDonViNhoNhat) || '', // đồng → nghìn đồng
    b.ghiChu || '',
    b.trangThai,
  ]);
  await clearAndWrite(sheets, sheetId, 'BangGiaChiTiet', rows);
  return rows.length;
};

const exportDanhMuc = async (sheets, sheetId) => {
  const data = await DanhMuc.find().lean();
  const rows = data.map((d) => [d.maDanhMuc, d.tenDanhMuc, d.moTa || '']);
  await clearAndWrite(sheets, sheetId, 'DanhMuc', rows);
  return rows.length;
};

const exportDonViTinh = async (sheets, sheetId) => {
  const data = await DonViTinh.find().lean();
  const rows = data.map((d) => [d.tenDonVi, d.ghiChu || '']);
  await clearAndWrite(sheets, sheetId, 'DonViTinh', rows);
  return rows.length;
};

// ─── Import Sheets → MongoDB ───────────────────────────────────────────────────

const readSheet = async (sheets, sheetId, sheetName) => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2:Z`,
  });
  return res.data.values || [];
};

const importHangHoa = async (sheets, sheetId) => {
  const rows = await readSheet(sheets, sheetId, 'HangHoa');

  // Guard: sheet rỗng hoặc < 3 dòng → dừng, không xoá MongoDB
  if (rows.length < 3) {
    console.warn(`[Sheets] HangHoa: chỉ có ${rows.length} dòng — bỏ qua import để bảo vệ dữ liệu`);
    return 0;
  }

  const validIds = [];
  for (const row of rows) {
    const [maHangHoa, tenHangHoa, donViNhoNhat, danhMuc, nhaCungCap, ghiChu, trangThai, , giaVonRaw, coHangRaw] = row;
    if (!maHangHoa || !tenHangHoa) continue;

    const updateFields = {
      tenHangHoa,
      donViNhoNhat: donViNhoNhat || '',
      danhMuc: danhMuc || '',
      ghiChu: ghiChu || '',
      trangThai: trangThai || 'Hoạt động',
      giaVon: fromSheets(giaVonRaw),
    };

    // Chỉ ghi đè coHang nếu Sheets có giá trị rõ ràng ('true'/'false')
    if (coHangRaw === 'true' || coHangRaw === 'false') {
      updateFields.coHang = coHangRaw === 'true';
    }

    // Chỉ ghi đè nhaCungCap nếu Sheets có giá trị — tránh xoá NCC đã chọn trong app
    if ((nhaCungCap || '').trim()) {
      updateFields.nhaCungCap = nhaCungCap.trim().split(',').map(s => s.trim()).filter(Boolean);
    }

    await HangHoa.findOneAndUpdate(
      { maHangHoa },
      { $set: updateFields },
      { upsert: true, new: true }
    );
    validIds.push(maHangHoa);
  }
  // KHÔNG xoá record trong MongoDB — hàng tạo trong app sẽ không bị mất
  // khi import từ Sheets. Muốn xoá phải thao tác thủ công trong app.
  return validIds.length;
};

const importBangGia = async (sheets, sheetId) => {
  const rows = await readSheet(sheets, sheetId, 'BangGiaChiTiet');
  const validIds = [];
  for (const row of rows) {
    const [maGia, maHangHoa, tenHangHoa, quyCachBan, soLuongQuyDoi, donViQuyCach, giaBanRaw, , ghiChu, trangThai] = row;
    if (!maGia || !maHangHoa) continue;
    await BangGia.findOneAndUpdate(
      { maGia },
      {
        maHangHoa, tenHangHoa, quyCachBan, donViQuyCach, ghiChu,
        soLuongQuyDoi: Number(soLuongQuyDoi) || 1,
        giaBan: fromSheets(giaBanRaw),
        trangThai: trangThai || 'Hoạt động',
      },
      { upsert: true, new: true }
    );
    validIds.push(maGia);
  }
  // KHÔNG xoá record trong MongoDB — bảng giá tạo trong app sẽ không bị mất
  return validIds.length;
};

const importDanhMuc = async (sheets, sheetId) => {
  const rows = await readSheet(sheets, sheetId, 'DanhMuc');
  const validIds = [];
  for (const row of rows) {
    const [maDanhMuc, tenDanhMuc, moTa] = row;
    if (!maDanhMuc || !tenDanhMuc) continue;
    await DanhMuc.findOneAndUpdate(
      { maDanhMuc },
      { tenDanhMuc, moTa: moTa || '' },
      { upsert: true }
    );
    validIds.push(maDanhMuc);
  }
  // Xóa các records không có trong Sheets
  if (validIds.length > 0) {
    await DanhMuc.deleteMany({ maDanhMuc: { $nin: validIds } });
  }
  return validIds.length;
};

const importDonViTinh = async (sheets, sheetId) => {
  const rows = await readSheet(sheets, sheetId, 'DonViTinh');
  const validNames = [];
  for (const row of rows) {
    const [tenDonVi, ghiChu] = row;
    if (!tenDonVi) continue;
    await DonViTinh.findOneAndUpdate(
      { tenDonVi },
      { ghiChu: ghiChu || '', trangThai: 'Hoạt động' },
      { upsert: true }
    );
    validNames.push(tenDonVi);
  }
  // Xóa các records không có trong Sheets
  if (validNames.length > 0) {
    await DonViTinh.deleteMany({ tenDonVi: { $nin: validNames } });
  }
  return validNames.length;
};

// ─── Public API ────────────────────────────────────────────────────────────────

const syncAll = async () => {
  const sheets = getSheets();
  const sheetId = SHEET_ID();
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID chưa được cấu hình trong .env');
  const [hangHoa, bangGia, danhMuc, donViTinh] = await Promise.all([
    exportHangHoa(sheets, sheetId),
    exportBangGia(sheets, sheetId),
    exportDanhMuc(sheets, sheetId),
    exportDonViTinh(sheets, sheetId),
  ]);
  console.log(`[Sheets Sync] Exported: HangHoa=${hangHoa}, BangGia=${bangGia}, DanhMuc=${danhMuc}, DonViTinh=${donViTinh}`);
  return { hangHoa, bangGia, danhMuc, donViTinh };
};

const importFromSheets = async () => {
  const sheets = getSheets();
  const sheetId = SHEET_ID();
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID chưa được cấu hình trong .env');
  const [danhMuc, donViTinh, hangHoa, bangGia] = await Promise.all([
    importDanhMuc(sheets, sheetId),
    importDonViTinh(sheets, sheetId),
    importHangHoa(sheets, sheetId),
    importBangGia(sheets, sheetId),
  ]);
  console.log(`[Sheets Import] Imported: DanhMuc=${danhMuc}, DonViTinh=${donViTinh}, HangHoa=${hangHoa}, BangGia=${bangGia}`);
  return { danhMuc, donViTinh, hangHoa, bangGia };
};

const startAutoSync = () => {
  const interval = Number(process.env.SYNC_INTERVAL_MINUTES) || 30;
  const cronExpr = `*/${interval} * * * *`;
  cron.schedule(cronExpr, async () => {
    console.log(`[Sheets Import] Auto import from Sheets at ${new Date().toISOString()}`);
    try {
      const result = await importFromSheets();
      console.log('[Sheets Import] Done:', result);
    }
    catch (err) { console.error('[Sheets Import] Error:', err.message); }
  });
  console.log(`[Sheets Import] Auto import from Sheets every ${interval} minutes`);
};

module.exports = { syncAll, importFromSheets, startAutoSync };
