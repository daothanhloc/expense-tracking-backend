const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    zaloId: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ['zalo', 'phone'],
      default: 'zalo',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index(
  { zaloId: 1 },
  { unique: true, partialFilterExpression: { zaloId: { $exists: true, $ne: null } } }
);

module.exports = mongoose.model('User', userSchema);
