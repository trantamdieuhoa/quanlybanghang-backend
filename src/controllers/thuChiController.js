const ThuChi = require('../models/ThuChi');

exports.getAll = async (req, res) => {
  try {
    const { loai, from, to, page=1, limit=50 } = req.query;
    const filter = {};
    if (loai) filter.loai = loai;
    if (from || to) {
      filter.ngayThuChi = {};
      if (from) filter.ngayThuChi.$gte = new Date(from);
      if (to)   filter.ngayThuChi.$lte = new Date(to+'T23:59:59');
    }
    const skip = (page-1)*limit;
    const [data, total] = await Promise.all([
      ThuChi.find(filter).sort({ ngayThuChi: -1 }).skip(skip).limit(Number(limit)),
      ThuChi.countDocuments(filter),
    ]);
    // Tổng thu / chi
    const tongThu = await ThuChi.aggregate([{ $match: { ...filter, loai:'Thu' } }, { $group: { _id:null, tong:{ $sum:'$soTien' } } }]);
    const tongChi = await ThuChi.aggregate([{ $match: { ...filter, loai:'Chi' } }, { $group: { _id:null, tong:{ $sum:'$soTien' } } }]);
    res.json({ data, total, tongThu: tongThu[0]?.tong||0, tongChi: tongChi[0]?.tong||0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const tc = new ThuChi({ ...req.body, nguoiTao: req.user?.username });
    await tc.save();
    res.status(201).json(tc);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const tc = await ThuChi.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tc) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(tc);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await ThuChi.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
