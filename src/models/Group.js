const mongoose = require('mongoose');
const crypto = require('crypto');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

groupSchema.pre('validate', function (next) {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
