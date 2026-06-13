const HangHoa = require('../models/HangHoa');
const BienThe = require('../models/BienThe');

/**
 * Chuẩn hoá danh sách mã vạch: trim, bỏ rỗng, loại trùng lặp trong cùng danh sách.
 */
const normalizeDsMaVach = (arr) => {
  if (!Array.isArray(arr)) return [];
  const set = new Set();
  for (const v of arr) {
    const s = (v ?? '').toString().trim();
    if (s) set.add(s);
  }
  return [...set];
};

/**
 * Gộp mã vạch chính (maVach) + danh sách phụ (dsMaVach) thành 1 danh sách
 * không trùng lặp — dùng để kiểm tra trùng trên toàn hệ thống.
 */
const collectAllMaVach = (maVach, dsMaVach) => {
  const set = new Set(normalizeDsMaVach(dsMaVach));
  const main = (maVach ?? '').toString().trim();
  if (main) set.add(main);
  return [...set];
};

/**
 * Kiểm tra các mã vạch trong `list` đã được dùng cho HangHoa/BienThe nào khác
 * chưa — quy tắc: 1 mã vạch chỉ thuộc 1 mặt hàng/biến thể trên toàn hệ thống.
 * Trả về thông tin bản ghi trùng đầu tiên, hoặc null nếu không trùng.
 */
const findTrungMaVach = async (list, { excludeMaHangHoa, excludeMaBienThe } = {}) => {
  if (!list.length) return null;

  const hhFilter = { $or: [{ maVach: { $in: list } }, { dsMaVach: { $in: list } }] };
  if (excludeMaHangHoa) hhFilter.maHangHoa = { $ne: excludeMaHangHoa };
  const hh = await HangHoa.findOne(hhFilter).select('maHangHoa tenHangHoa maVach dsMaVach').lean();
  if (hh) {
    const trung = list.find((m) => m === hh.maVach || (hh.dsMaVach || []).includes(m));
    return { loai: 'HangHoa', ma: hh.maHangHoa, ten: hh.tenHangHoa, maVach: trung };
  }

  const btFilter = { $or: [{ maVach: { $in: list } }, { dsMaVach: { $in: list } }] };
  if (excludeMaBienThe) btFilter.maBienThe = { $ne: excludeMaBienThe };
  const bt = await BienThe.findOne(btFilter).select('maBienThe tenBienThe maVach dsMaVach').lean();
  if (bt) {
    const trung = list.find((m) => m === bt.maVach || (bt.dsMaVach || []).includes(m));
    return { loai: 'BienThe', ma: bt.maBienThe, ten: bt.tenBienThe, maVach: trung };
  }

  return null;
};

/** Thông báo lỗi thân thiện cho mã vạch trùng */
const trungMaVachMessage = (trung) =>
  `Mã vạch "${trung.maVach}" đã được dùng cho ${trung.loai === 'BienThe' ? 'biến thể' : 'hàng hoá'} "${trung.ten}"`;

module.exports = { normalizeDsMaVach, collectAllMaVach, findTrungMaVach, trungMaVachMessage };
