const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Token không hợp lệ' });
    if (req.user.trangThai === 'Khoá') {
      return res.status(403).json({ message: 'Tài khoản đã bị khoá' });
    }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Chỉ admin mới có quyền thực hiện thao tác này' });
};

// requirePermission('xem_cong_no') hoặc requirePermission(['ban_hang','xem_cong_no'])
// admin luôn được bypass; nhân viên cần có ít nhất 1 permission trong danh sách
const requirePermission = (permissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Không có quyền truy cập' });
  if (req.user.role === 'admin') return next();

  const required = Array.isArray(permissions) ? permissions : [permissions];
  const userPerms = req.user.permissions || [];
  if (required.some((p) => userPerms.includes(p))) return next();

  res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
};

module.exports = { protect, adminOnly, requirePermission };
