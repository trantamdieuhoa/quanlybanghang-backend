const HoaDon    = require('../models/HoaDon');
const KhachHang = require('../models/KhachHang');
const HangHoa   = require('../models/HangHoa');
const BienThe   = require('../models/BienThe');
const { syncTonKho } = require('./bienTheController');

// Helper ghi log vào document (chưa save)
const addLog = (hd, hanhDong, nguoi, chiTiet = '') => {
  hd.lichSu.push({
    hanhDong,
    nguoiThucHien: nguoi || 'Hệ thống',
    thoiGian: new Date(),
    chiTiet,
  });
};

// "Nổ" danh sách chiTiet thành 2 map thay đổi tồn kho:
// - hangHoaMap: { maHangHoa: soLuong } — áp dụng lên HangHoa.tonKho (dòng thường + thành phần combo)
// - bienTheMap: { maBienThe: { maHangHoa, qty } } — áp dụng lên BienThe.tonKho (dòng có chọn biến thể)
const expandStockChanges = (chiTiet) => {
  const hangHoaMap = {};
  const bienTheMap = {};
  for (const ct of chiTiet) {
    if (ct.maCombo && Array.isArray(ct.comboThanhPhan) && ct.comboThanhPhan.length > 0) {
      for (const tp of ct.comboThanhPhan) {
        hangHoaMap[tp.maHangHoa] = (hangHoaMap[tp.maHangHoa] || 0) + tp.soLuong * ct.soLuong;
      }
    } else if (ct.maBienThe) {
      if (!bienTheMap[ct.maBienThe]) bienTheMap[ct.maBienThe] = { maHangHoa: ct.maHangHoa, qty: 0 };
      bienTheMap[ct.maBienThe].qty += ct.soLuong;
    } else {
      hangHoaMap[ct.maHangHoa] = (hangHoaMap[ct.maHangHoa] || 0) + ct.soLuong;
    }
  }
  return { hangHoaMap, bienTheMap };
};

// Áp dụng thay đổi tồn kho: sign = -1 khi bán (trừ kho), +1 khi hoàn (huỷ/xoá đơn)
// Trả về danh sách maHangHoa bị ảnh hưởng (để check coHang)
const applyStockChanges = async ({ hangHoaMap, bienTheMap }, sign) => {
  const promises = [];
  for (const [ma, qty] of Object.entries(hangHoaMap)) {
    if (qty !== 0) promises.push(HangHoa.findOneAndUpdate({ maHangHoa: ma }, { $inc: { tonKho: sign * qty } }));
  }
  const affectedHH = new Set();
  for (const [maBT, info] of Object.entries(bienTheMap)) {
    if (info.qty !== 0) {
      promises.push(BienThe.findOneAndUpdate({ maBienThe: maBT }, { $inc: { tonKho: sign * info.qty } }));
      affectedHH.add(info.maHangHoa);
    }
  }
  await Promise.all(promises);
  for (const ma of affectedHH) await syncTonKho(ma);
  return [...Object.keys(hangHoaMap), ...affectedHH];
};

// Mô tả thay đổi chi tiết (so sánh theo maBienThe nếu có, ngược lại maHangHoa)
const describeChiTiet = (oldList, newList) => {
  const key = (c) => c.maBienThe || c.maHangHoa;
  const oldMap = Object.fromEntries(oldList.map(c => [key(c), c]));
  const newMap = Object.fromEntries(newList.map(c => [key(c), c]));
  const allKeys = new Set([...oldList.map(key), ...newList.map(key)]);
  const parts  = [];
  for (const k of allKeys) {
    const o = oldMap[k]; const n = newMap[k];
    const ten = (n || o).tenHangHoa || k;
    if (!o)                             parts.push(`Thêm ${ten} (×${n.soLuong})`);
    else if (!n)                        parts.push(`Xoá ${ten}`);
    else if (o.soLuong !== n.soLuong)   parts.push(`${ten}: ${o.soLuong}→${n.soLuong}`);
    else if (o.donGia  !== n.donGia)    parts.push(`${ten}: giá ${o.donGia}→${n.donGia}`);
  }
  return parts.join(' • ') || 'Không thay đổi';
};

exports.getAll = async (req, res) => {
  try {
    const { search='', maKhachHang, trangThaiTT, from, to, page=1, limit=50 } = req.query;
    const filter = { trangThai: 'Hoạt động' };
    if (search) filter.$or = [
      { maHoaDon: new RegExp(search,'i') },
      { tenKhachHang: new RegExp(search,'i') },
    ];
    if (maKhachHang) filter.maKhachHang = maKhachHang;
    if (trangThaiTT) filter.trangThaiTT = trangThaiTT;
    if (from || to) {
      filter.ngayBan = {};
      if (from) filter.ngayBan.$gte = new Date(from);
      if (to)   filter.ngayBan.$lte = new Date(to + 'T23:59:59');
    }
    const skip = (page-1)*limit;
    const [data, total] = await Promise.all([
      HoaDon.find(filter).sort({ ngayBan: -1 }).skip(skip).limit(Number(limit)).select('-chiTiet'),
      HoaDon.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    res.json(hd);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body, nguoiTao: req.user?.username };
    if (Array.isArray(body.chiTiet) && body.chiTiet.length > 0) {
      // Thu thập mã hàng/biến thể cần lấy giaVon: dòng thường + thành phần combo + biến thể
      const maCodes = new Set();
      const btCodes = new Set();
      body.chiTiet.forEach((c) => {
        if (c.maCombo && Array.isArray(c.comboThanhPhan) && c.comboThanhPhan.length > 0) {
          c.comboThanhPhan.forEach((tp) => maCodes.add(tp.maHangHoa));
        } else if (c.maBienThe) {
          btCodes.add(c.maBienThe);
          maCodes.add(c.maHangHoa);
        } else {
          maCodes.add(c.maHangHoa);
        }
      });
      const [hangHoas, bienThes] = await Promise.all([
        HangHoa.find({ maHangHoa: { $in: [...maCodes] } }).select('maHangHoa giaVon tonKho').lean(),
        btCodes.size > 0
          ? BienThe.find({ maBienThe: { $in: [...btCodes] } }).select('maBienThe giaVon tenBienThe').lean()
          : [],
      ]);
      const giaVonMap   = Object.fromEntries(hangHoas.map((h) => [h.maHangHoa, h.giaVon || 0]));
      const btGiaVonMap = Object.fromEntries(bienThes.map((b) => [b.maBienThe, b.giaVon || 0]));
      const btTenMap    = Object.fromEntries(bienThes.map((b) => [b.maBienThe, b.tenBienThe || '']));
      body.chiTiet = body.chiTiet.map((c) => {
        if (c.maCombo && Array.isArray(c.comboThanhPhan) && c.comboThanhPhan.length > 0) {
          const comboThanhPhan = c.comboThanhPhan.map((tp) => ({ ...tp, giaVon: giaVonMap[tp.maHangHoa] ?? 0 }));
          const giaVon = comboThanhPhan.reduce((s, tp) => s + tp.giaVon * tp.soLuong, 0);
          return { ...c, comboThanhPhan, giaVon };
        }
        if (c.maBienThe) {
          return {
            ...c,
            giaVon: btGiaVonMap[c.maBienThe] ?? giaVonMap[c.maHangHoa] ?? 0,
            tenBienThe: c.tenBienThe || btTenMap[c.maBienThe] || '',
          };
        }
        return { ...c, giaVon: giaVonMap[c.maHangHoa] ?? 0 };
      });
    }
    const hd = new HoaDon(body);
    addLog(hd, 'Tạo hoá đơn', req.user?.username,
      `${hd.chiTiet.length} sản phẩm • KH: ${hd.tenKhachHang}`);
    await hd.save();

    const stockChanges = expandStockChanges(hd.chiTiet);
    const affectedCodes = await applyStockChanges(stockChanges, -1);

    if (hd.maKhachHang) {
      await KhachHang.findOneAndUpdate(
        { maKhachHang: hd.maKhachHang },
        { $inc: { tongCongNo: hd.conNo > 0 ? hd.conNo : 0, tongMuaHang: hd.tongThanhToan } }
      );
    }

    // Tự động đánh dấu hết hàng cho các SP vừa bán (kể cả thành phần combo + biến thể) mà tonKho về <= 0
    await HangHoa.updateMany(
      { maHangHoa: { $in: [...new Set(affectedCodes)] }, tonKho: { $lte: 0 }, coHang: { $ne: false } },
      { $set: { coHang: false } }
    );

    res.status(201).json(hd);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const old = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!old) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    const changed = [];
    if (req.body.ghiChu   !== undefined && req.body.ghiChu   !== old.ghiChu)   changed.push('ghi chú');
    if (req.body.giamGia  !== undefined && req.body.giamGia  !== old.giamGia)  changed.push('giảm giá');
    if (req.body.giamGiaPhanTram !== undefined && req.body.giamGiaPhanTram !== old.giamGiaPhanTram)
      changed.push(`giảm giá ${req.body.giamGiaPhanTram}%`);
    if (req.body.phuongThucTT !== undefined && req.body.phuongThucTT !== old.phuongThucTT)
      changed.push(`PT thanh toán → ${req.body.phuongThucTT}`);
    Object.assign(old, req.body);
    addLog(old, 'Sửa thông tin', req.user?.username,
      changed.length ? changed.join(' • ') : 'Cập nhật');
    await old.save();
    res.json(old);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.updateChiTiet = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    const oldChiTiet = hd.chiTiet;
    const newChiTiet = req.body.chiTiet || [];

    // Khoá so sánh: maBienThe nếu có, ngược lại maHangHoa
    const lineKey = (c) => c.maBienThe || c.maHangHoa;
    const oldKeys = new Set(oldChiTiet.map(lineKey));

    // Fetch giaVon cho: (1) dòng thường/biến thể mới thêm, (2) thành phần combo chưa có giaVon
    const maCodesNeedGiaVon = new Set();
    const btCodesNeedGiaVon = new Set();
    newChiTiet.forEach((ct) => {
      if (ct.maCombo && Array.isArray(ct.comboThanhPhan) && ct.comboThanhPhan.length > 0) {
        ct.comboThanhPhan.forEach((tp) => {
          if (tp.giaVon === undefined || tp.giaVon === null) maCodesNeedGiaVon.add(tp.maHangHoa);
        });
      } else if (!oldKeys.has(lineKey(ct))) {
        if (ct.maBienThe) btCodesNeedGiaVon.add(ct.maBienThe);
        else maCodesNeedGiaVon.add(ct.maHangHoa);
      }
    });
    const [freshHH, freshBT] = await Promise.all([
      maCodesNeedGiaVon.size > 0
        ? HangHoa.find({ maHangHoa: { $in: [...maCodesNeedGiaVon] } }).select('maHangHoa giaVon').lean()
        : [],
      btCodesNeedGiaVon.size > 0
        ? BienThe.find({ maBienThe: { $in: [...btCodesNeedGiaVon] } }).select('maBienThe giaVon tenBienThe').lean()
        : [],
    ]);
    const giaVonMap   = Object.fromEntries(freshHH.map(h => [h.maHangHoa, h.giaVon || 0]));
    const btGiaVonMap = Object.fromEntries(freshBT.map(b => [b.maBienThe, b.giaVon || 0]));
    const btTenMap    = Object.fromEntries(freshBT.map(b => [b.maBienThe, b.tenBienThe || '']));

    const desc = describeChiTiet(oldChiTiet, newChiTiet);
    hd.chiTiet = newChiTiet.map(ct => {
      const old = oldChiTiet.find(c => lineKey(c) === lineKey(ct)) || {};
      if (ct.maCombo && Array.isArray(ct.comboThanhPhan) && ct.comboThanhPhan.length > 0) {
        const comboThanhPhan = ct.comboThanhPhan.map(tp => ({
          ...tp,
          giaVon: (tp.giaVon !== undefined && tp.giaVon !== null) ? tp.giaVon : (giaVonMap[tp.maHangHoa] ?? 0),
        }));
        const giaVon = comboThanhPhan.reduce((s, tp) => s + tp.giaVon * tp.soLuong, 0);
        return { ...ct, soLuongDaTra: old.soLuongDaTra || 0, comboThanhPhan, giaVon };
      }
      if (ct.maBienThe) {
        const giaVon = old.giaVon || btGiaVonMap[ct.maBienThe] || giaVonMap[ct.maHangHoa] || ct.giaVon || 0;
        return {
          ...ct,
          soLuongDaTra: old.soLuongDaTra || 0,
          giaVon,
          tenBienThe: ct.tenBienThe || old.tenBienThe || btTenMap[ct.maBienThe] || '',
        };
      }
      return { ...ct, soLuongDaTra: old.soLuongDaTra || 0, giaVon: old.giaVon || giaVonMap[ct.maHangHoa] || ct.giaVon || 0 };
    });

    // Tính delta tồn kho (đã "nổ" combo thành thành phần, biến thể tách riêng theo maBienThe)
    const oldExpand = expandStockChanges(oldChiTiet);
    const newExpand = expandStockChanges(hd.chiTiet);
    const stockPromises = [];

    const allMaHH = new Set([...Object.keys(oldExpand.hangHoaMap), ...Object.keys(newExpand.hangHoaMap)]);
    for (const ma of allMaHH) {
      const delta = (newExpand.hangHoaMap[ma] || 0) - (oldExpand.hangHoaMap[ma] || 0);
      if (delta !== 0) {
        stockPromises.push(HangHoa.findOneAndUpdate({ maHangHoa: ma }, { $inc: { tonKho: -delta } }));
      }
    }

    const affectedHH = new Set();
    const allBT = new Set([...Object.keys(oldExpand.bienTheMap), ...Object.keys(newExpand.bienTheMap)]);
    for (const maBT of allBT) {
      const oldQty = oldExpand.bienTheMap[maBT]?.qty || 0;
      const newQty = newExpand.bienTheMap[maBT]?.qty || 0;
      const delta = newQty - oldQty;
      if (delta !== 0) {
        const maHH = (newExpand.bienTheMap[maBT] || oldExpand.bienTheMap[maBT]).maHangHoa;
        stockPromises.push(BienThe.findOneAndUpdate({ maBienThe: maBT }, { $inc: { tonKho: -delta } }));
        affectedHH.add(maHH);
      }
    }

    addLog(hd, 'Sửa chi tiết', req.user?.username, desc);
    await Promise.all([hd.save(), ...stockPromises]);
    for (const ma of affectedHH) await syncTonKho(ma);
    res.json(hd);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.cancel = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    // Hoàn lại tồn kho (kể cả thành phần combo + biến thể)
    await applyStockChanges(expandStockChanges(hd.chiTiet), 1);
    // Hoàn lại thống kê khách hàng (cả đơn đã TT đủ lẫn còn nợ)
    if (hd.maKhachHang) {
      await KhachHang.findOneAndUpdate(
        { maKhachHang: hd.maKhachHang },
        { $inc: { tongCongNo: hd.conNo > 0 ? -hd.conNo : 0, tongMuaHang: -hd.tongThanhToan } }
      );
    }
    hd.trangThai = 'Đã huỷ';
    addLog(hd, 'Huỷ hoá đơn', req.user?.username, `Tổng: ${hd.tongThanhToan.toLocaleString('vi-VN')}đ`);
    await hd.save();
    res.json({ message: 'Da huy hoa don' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/hoa-don/:id/force — xóa hẳn khỏi DB (admin only)
exports.deleteForce = async (req, res) => {
  try {
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Không tìm thấy hoá đơn' });
    // Hoàn lại tồn kho (kể cả thành phần combo + biến thể)
    await applyStockChanges(expandStockChanges(hd.chiTiet), 1);
    // Hoàn lại thống kê khách hàng
    if (hd.maKhachHang) {
      await KhachHang.findOneAndUpdate(
        { maKhachHang: hd.maKhachHang },
        { $inc: { tongCongNo: hd.conNo > 0 ? -hd.conNo : 0, tongMuaHang: -hd.tongThanhToan } }
      );
    }
    await HoaDon.deleteOne({ maHoaDon: req.params.id });
    res.json({ message: 'Đã xoá hoá đơn' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addPayment = async (req, res) => {
  try {
    const { soTien, phuongThuc } = req.body;
    const hd = await HoaDon.findOne({ maHoaDon: req.params.id });
    if (!hd) return res.status(404).json({ message: 'Khong tim thay hoa don' });
    const oldNo = hd.conNo;
    hd.daThanhToan = Math.min(hd.tongThanhToan, hd.daThanhToan + Number(soTien));
    addLog(hd, 'Thanh toán thêm', req.user?.username,
      `+${Number(soTien).toLocaleString('vi-VN')}đ (${phuongThuc || 'Tiền mặt'})`);
    await hd.save();
    const diff = oldNo - hd.conNo;
    if (hd.maKhachHang && diff > 0) {
      await KhachHang.findOneAndUpdate({ maKhachHang: hd.maKhachHang }, { $inc: { tongCongNo: -diff } });
    }
    res.json(hd);
  } catch (err) { res.status(400).json({ message: err.message }); }
};
