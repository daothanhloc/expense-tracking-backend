const Group = require('../models/Group');
const Transaction = require('../models/Transaction');
const Contribution = require('../models/Contribution');
const Goal = require('../models/Goal');

const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Tên nhóm không được để trống' });
    }

    const group = await Group.create({
      name: name.trim(),
      createdBy: req.user._id,
      members: [req.user._id],
    });

    await group.populate('members', 'name avatarUrl');

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo nhóm', error: error.message });
  }
};

const joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode?.trim()) {
      return res.status(400).json({ message: 'Thiếu mã mời' });
    }

    const group = await Group.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
    });
    if (!group) {
      return res.status(404).json({ message: 'Mã mời không hợp lệ' });
    }

    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Bạn đã ở trong nhóm này' });
    }

    group.members.push(req.user._id);
    await group.save();
    await group.populate('members', 'name avatarUrl');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tham gia nhóm', error: error.message });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name avatarUrl')
      .sort({ createdAt: -1 });

    res.json({ groups });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách nhóm', error: error.message });
  }
};

const getGroupDetail = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'members',
      'name avatarUrl'
    );

    if (!group) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }

    if (!group.members.some((m) => m._id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Bạn không thuộc nhóm này' });
    }

    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin nhóm', error: error.message });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Bạn không thuộc nhóm này' });
    }

    group.members = group.members.filter(
      (m) => !m.equals(req.user._id)
    );
    await group.save();

    res.json({ message: 'Đã rời nhóm' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi rời nhóm', error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }

    if (!group.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Chỉ người tạo nhóm mới được xoá' });
    }

    await Transaction.deleteMany({ groupId: group._id });
    await Contribution.deleteMany({ groupId: group._id });
    await Goal.deleteMany({ groupId: group._id });
    await group.deleteOne();

    res.json({ message: 'Nhóm đã được xoá thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xoá nhóm', error: error.message });
  }
};

module.exports = {
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupDetail,
  leaveGroup,
  deleteGroup,
};
