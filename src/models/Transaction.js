const mongoose = require('mongoose');

const CATEGORIES = [
  'Ăn uống',
  'Đi lại',
  'Nhà ở',
  'Mua sắm',
  'Giải trí',
  'Sức khỏe',
  'Khác',
];

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
      default: 'Khác',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    rawInput: {
      // Original text the user typed
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries by date
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.CATEGORIES = CATEGORIES;
