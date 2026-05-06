const Contribution = require('../models/Contribution');
const { getFundSummary, getFundByMonth } = require('../services/fundService');
const dayjs = require('dayjs');

const getFund = async (req, res) => {
  try {
    const fund = await getFundSummary(req.group._id);
    res.json(fund);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin quỹ', error: error.message });
  }
};

const getFundMonth = async (req, res) => {
  try {
    const { month } = req.params;
    const data = await getFundByMonth(req.group._id, month);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin quỹ tháng', error: error.message });
  }
};

const contribute = async (req, res) => {
  try {
    const { amount, month, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    const targetMonth = month || dayjs().format('YYYY-MM');

    const contribution = await Contribution.findOneAndUpdate(
      { groupId: req.group._id, userId: req.user._id, month: targetMonth },
      {
        groupId: req.group._id,
        userId: req.user._id,
        amount,
        month: targetMonth,
        note: note || `Đóng góp tháng ${targetMonth}`,
      },
      { upsert: true, new: true }
    );

    await contribution.populate('userId', 'name');

    const fund = await getFundSummary(req.group._id);

    res.status(201).json({ contribution, fund });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đóng góp', error: error.message });
  }
};

const getContributions = async (req, res) => {
  try {
    const contributions = await Contribution.find({ groupId: req.group._id })
      .populate('userId', 'name avatarUrl')
      .sort({ month: -1, createdAt: -1 });

    res.json({ contributions });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy lịch sử đóng góp', error: error.message });
  }
};

module.exports = { getFund, getFundMonth, contribute, getContributions };
