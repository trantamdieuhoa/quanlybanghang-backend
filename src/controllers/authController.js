const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Vui lòng nhập username và password' });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Sai username hoặc password' });

    if (user.trangThai === 'Khoá')
      return res.status(403).json({ message: 'Tài khoản đã bị khoá' });

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, username: user.username, hoTen: user.hoTen, role: user.role, permissions: user.permissions },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/register (admin only)
exports.register = async (req, res) => {
  try {
    const { username, password, hoTen, role } = req.body;
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Username đã tồn tại' });

    const user = await User.create({ username, password, hoTen, role });
    res.status(201).json({
      user: { id: user._id, username: user.username, hoTen: user.hoTen, role: user.role, permissions: user.permissions },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: { id: req.user._id, username: req.user.username, hoTen: req.user.hoTen, role: req.user.role } });
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(oldPassword)))
      return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
