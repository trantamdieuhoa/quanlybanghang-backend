/**
 * Middleware chặn request từ ngoài LAN.
 * Đọc ALLOWED_SUBNET từ .env, ví dụ: "192.168.1"
 * Request có IP không khớp subnet sẽ bị từ chối 403.
 */
const lanOnly = (req, res, next) => {
  const subnet = process.env.ALLOWED_SUBNET;
  if (!subnet) return next(); // Không cấu hình = bỏ qua

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '';

  // Chuẩn hoá IPv6 loopback
  const normalizedIp = ip === '::1' ? '127.0.0.1' : ip.replace('::ffff:', '');

  // So khớp theo octet (tránh "192.168.1" match nhầm "192.168.10.x"/"192.168.100.x")
  const normalizedSubnet = subnet.replace(/\.$/, '');
  const isInSubnet =
    normalizedIp === normalizedSubnet || normalizedIp.startsWith(`${normalizedSubnet}.`);

  if (normalizedIp === '127.0.0.1' || isInSubnet) {
    return next();
  }

  console.warn(`[LAN-ONLY] Blocked IP: ${normalizedIp}`);
  return res.status(403).json({ message: 'Truy cập bị từ chối: chỉ cho phép từ mạng nội bộ' });
};

module.exports = lanOnly;
