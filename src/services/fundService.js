const Contribution = require('../models/Contribution');
const Transaction = require('../models/Transaction');

const getFundSummary = async (groupId) => {
  const [salaryResult, expenseResult] = await Promise.all([
    Contribution.aggregate([
      { $match: { groupId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { groupId, type: 'expense', status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalContributed = salaryResult[0]?.total || 0;
  const totalSpent = expenseResult[0]?.total || 0;
  const balance = totalContributed - totalSpent;

  return {
    balance,
    totalContributed,
    totalSpent,
  };
};

const getFundByMonth = async (groupId, month) => {
  const startDate = new Date(`${month}-01T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const [contributions, expenses] = await Promise.all([
    Contribution.find({ groupId, month }).populate('userId', 'name'),
    Transaction.find({
      groupId,
      type: 'expense',
      status: 'confirmed',
      createdAt: { $gte: startDate, $lt: endDate },
    }).populate('createdBy', 'name'),
  ]);

  const totalContributed = contributions.reduce((s, c) => s + c.amount, 0);
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

  return {
    month,
    totalContributed,
    totalSpent,
    balance: totalContributed - totalSpent,
    contributions,
    expenses,
  };
};

module.exports = { getFundSummary, getFundByMonth };
