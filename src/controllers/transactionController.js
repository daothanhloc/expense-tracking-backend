const Transaction = require('../models/Transaction');
const { parseTransaction } = require('../services/aiService');
const { getFundSummary } = require('../services/fundService');
const dayjs = require('dayjs');

/**
 * POST /api/transactions/parse
 * Body: { rawInput: "Mua 100k tiền xăng" }
 * Returns AI-parsed transaction for user to confirm
 */
const parseInput = async (req, res) => {
  try {
    const { rawInput } = req.body;
    if (!rawInput?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung' });
    }

    const result = await parseTransaction(rawInput.trim());

    if (!result.success) {
      return res.status(422).json({ message: result.error });
    }

    res.json({ parsed: result.data });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi phân tích AI', error: error.message });
  }
};

/**
 * POST /api/transactions
 * Body: { type, amount, category, description, rawInput, goalId? }
 * Creates a CONFIRMED transaction
 */
const createTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, rawInput, goalId } = req.body;

    const transaction = await Transaction.create({
      type,
      amount,
      category,
      description,
      rawInput,
      createdBy: req.user._id,
      groupId: req.group._id,
      goalId: goalId || null,
      status: 'confirmed',
    });

    await transaction.populate('createdBy', 'name avatarUrl');

    // Return updated fund balance alongside
    const fund = await getFundSummary(req.group._id);

    res.status(201).json({ transaction, fund });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo giao dịch', error: error.message });
  }
};

/**
 * GET /api/transactions
 * Query: userId?, startDate?, endDate?, category?, type?, page?, limit?
 */
const getTransactions = async (req, res) => {
  try {
    const {
      userId,
      startDate,
      endDate,
      category,
      type,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { status: 'confirmed', groupId: req.group._id };

    if (userId) filter.createdBy = userId;
    if (category) filter.category = category;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('createdBy', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách', error: error.message });
  }
};

/**
 * PATCH /api/transactions/:id
 * Update a transaction
 */
const updateTransaction = async (req, res) => {
  try {
    const { amount, category, description, type } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { amount, category, description, type },
      { new: true }
    ).populate('createdBy', 'name avatarUrl');

    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    res.json({ transaction });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
  }
};

/**
 * DELETE /api/transactions/:id
 */
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    const fund = await getFundSummary(req.group._id);
    res.json({ message: 'Đã xoá giao dịch', fund });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xoá', error: error.message });
  }
};

/**
 * GET /api/transactions/stats
 * Query: month (YYYY-MM) or startDate/endDate
 */
const getStats = async (req, res) => {
  try {
    const { month } = req.query;

    let dateFilter = {};
    if (month) {
      const start = dayjs(`${month}-01`).startOf('month').toDate();
      const end = dayjs(`${month}-01`).endOf('month').toDate();
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    const baseMatch = { groupId: req.group._id };

    const [byCategory, byUser, totals] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...baseMatch, type: 'expense', status: 'confirmed', ...dateFilter } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),

      Transaction.aggregate([
        { $match: { ...baseMatch, type: 'expense', status: 'confirmed', ...dateFilter } },
        { $group: { _id: '$createdBy', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $project: { name: '$user.name', total: 1, count: 1 } },
      ]),

      Transaction.aggregate([
        { $match: { ...baseMatch, status: 'confirmed', ...dateFilter } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const totalIncome = totals.find((t) => t._id === 'income')?.total || 0;
    const totalExpense = totals.find((t) => t._id === 'expense')?.total || 0;

    res.json({
      month,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      byCategory,
      byUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thống kê', error: error.message });
  }
};

module.exports = {
  parseInput,
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getStats,
};
