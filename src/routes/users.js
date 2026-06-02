const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ALL_PERMISSIONS, DEFAULT_NV_PERMISSIONS } = require('../models/User');

router.use(protect, adminOnly);

// GET /api/users — danh sách nhân viên
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users — tạo tài khoản mới
router.post('/', async (req, res) => {
  try {
    const { username, password, hoTen, role, permissions } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Thiếu username hoặc password' });
    const user = await User.create({
      username, password, hoTen: hoTen || '',
      role: role || 'nhanvien',
      permissions: role === 'admin' ? ALL_PERMISSIONS : (permissions || DEFAULT_NV_PERMISSIONS),
    });
    res.status(201).json({ ...user.toObject(), password: undefined });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Username đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id/permissions — cập nhật quyền
router.put('/:id/permissions', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body.permissions },
      { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/:id — cập nhật thông tin (hoTen, trangThai, reset password)
router.put('/:id', async (req, res) => {
  try {
    const { hoTen, trangThai, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    if (hoTen !== undefined) user.hoTen = hoTen;
    if (trangThai !== undefined) user.trangThai = trangThai;
    if (newPassword) user.password = newPassword; // sẽ được hash bởi pre-save hook
    await user.save();
    res.json({ ...user.toObject(), password: undefined });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá tài khoản' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/permissions/all — danh sách tất cả quyền
router.get('/permissions/all', (req, res) => {
  res.json(ALL_PERMISSIONS);
});

module.exports = router;
