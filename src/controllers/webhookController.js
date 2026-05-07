const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Contribution = require('../models/Contribution');
const Group = require('../models/Group');
const Goal = require('../models/Goal');

/**
 * Shared cascading deletion logic.
 * Deletes all data associated with a user, in dependency order.
 * @param {string} userId - MongoDB ObjectId string of the user to delete
 * @returns {Object} counts of deleted records
 */
const deleteUserData = async (userId) => {
  const transactions = await Transaction.deleteMany({ createdBy: userId });
  const contributions = await Contribution.deleteMany({ userId });

  // Remove user's contribution entries from Goals and recalculate currentAmount
  const goals = await Goal.find({ 'contributions.userId': userId });
  for (const goal of goals) {
    goal.contributions = goal.contributions.filter(
      (c) => c.userId.toString() !== userId.toString()
    );
    goal.currentAmount = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
    await goal.save();
  }

  // Remove user from group members
  const groups = await Group.find({ members: userId });
  const emptyGroupIds = [];
  for (const group of groups) {
    group.members = group.members.filter(
      (m) => m.toString() !== userId.toString()
    );
    if (group.members.length === 0) {
      emptyGroupIds.push(group._id);
    }
    await group.save();
  }

  // Delete goals and groups that are now empty
  if (emptyGroupIds.length > 0) {
    await Goal.deleteMany({ groupId: { $in: emptyGroupIds } });
    await Group.deleteMany({ _id: { $in: emptyGroupIds } });
  }

  // Delete the user
  await User.findByIdAndDelete(userId);

  const result = {
    transactions: transactions.deletedCount,
    contributions: contributions.deletedCount,
    goals: goals.length,
    groups: groups.length,
    emptyGroups: emptyGroupIds.length,
  };
  console.log(`[DATA DELETION] userId=${userId} |`, JSON.stringify(result));
  return result;
};

/**
 * GET /api/webhooks/zalo
 * Zalo webhook URL verification handshake.
 */
const zaloWebhookVerify = (req, res) => {
  const { oa_id } = req.query;
  if (!oa_id || oa_id !== process.env.ZALO_APP_ID) {
    return res.status(403).json({ errorCode: 1, message: 'Invalid oa_id' });
  }
  res.json({ errorCode: 0, message: 'Success' });
};

/**
 * POST /api/webhooks/zalo
 * Handles Zalo events (user data deletion).
 */
const zaloWebhookHandler = async (req, res) => {
  try {
    const { event, oa_id, user_id_by_app } = req.body;

    if (!oa_id || oa_id !== process.env.ZALO_APP_ID) {
      return res.status(403).json({ errorCode: 1, message: 'Invalid oa_id' });
    }

    if (event === 'user.remove.info') {
      if (!user_id_by_app) {
        return res.status(400).json({ errorCode: 1, message: 'Missing user_id_by_app' });
      }

      const user = await User.findOne({ zaloId: user_id_by_app });
      if (!user) {
        return res.json({ errorCode: 0, message: 'No data found' });
      }

      await deleteUserData(user._id.toString());
      return res.json({ errorCode: 0, message: 'Success' });
    }

    res.json({ errorCode: 0, message: 'Event ignored' });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
    // Acknowledge to Zalo even on failure (they don't retry)
    res.json({ errorCode: 0, message: 'Acknowledged' });
  }
};

module.exports = {
  zaloWebhookVerify,
  zaloWebhookHandler,
  deleteUserData,
};
