const Group = require('../models/Group');

const groupAccess = async (req, res, next) => {
  try {
    const groupId = req.query.groupId || req.headers['x-group-id'];

    if (!groupId) {
      return res.status(400).json({ message: 'Thiếu groupId' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });
    }

    req.group = group;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Lỗi kiểm tra nhóm', error: error.message });
  }
};

module.exports = { groupAccess };
