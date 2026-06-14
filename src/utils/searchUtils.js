/**
 * searchUtils.js
 * Tiện ích tìm kiếm không phân biệt dấu tiếng Việt + không phân biệt thứ tự từ.
 *
 * Vấn đề: $regex của MongoDB không hỗ trợ so khớp bỏ dấu tiếng Việt (collation
 * không áp dụng cho $regex), và regex 1 chuỗi liên tục không match khi user gõ
 * các từ không đúng thứ tự xuất hiện trong dữ liệu.
 *
 * Giải pháp: các model lưu thêm field "...KhongDau" (bỏ dấu + lowercase, tự
 * tính qua removeDiacritics trong pre('save')). Khi search, removeDiacritics()
 * chuỗi search rồi tách thành từng từ, build $and các $or theo từng từ trên
 * field KhongDau — match mọi thứ tự từ, không phân biệt dấu/hoa-thường.
 */

// Bỏ dấu tiếng Việt + lowercase
const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');
const D_STROKE_REGEX = new RegExp('\\u0111', 'g'); // 'đ' (lowercase d with stroke)

const removeDiacritics = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '') // bỏ dấu (combining diacritical marks)
    .replace(D_STROKE_REGEX, 'd')
    .trim();
};

// Escape ký tự đặc biệt regex để tránh lỗi/khai thác khi search chứa ký tự regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Build MongoDB filter: $and các $or theo từng từ trong `search` (đã bỏ dấu),
 * match trên các field truyền vào (field phải là field đã lưu dạng KhongDau).
 * Trả về null nếu search rỗng.
 *
 * @param {string} search - chuỗi tìm kiếm gốc (có thể có dấu)
 * @param {string[]} fields - danh sách field đã chuẩn hoá (KhongDau) để so khớp
 * @returns {object|null}
 */
const buildSearchFilter = (search, fields) => {
  const normalized = removeDiacritics(search);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  return {
    $and: words.map((word) => ({
      $or: fields.map((field) => ({ [field]: { $regex: escapeRegex(word), $options: 'i' } })),
    })),
  };
};

module.exports = { removeDiacritics, buildSearchFilter, escapeRegex };
