const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { deleteUserData } = require('./webhookController');

const signToken = (user) =>
  jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  avatarUrl: user.avatarUrl,
  notificationEnabled: user.notificationEnabled,
  phone: user.phone || undefined,
});

/**
 * POST /api/auth/zalo
 * Body: { accessToken, name, avatarUrl }
 * - Verifies Zalo access token
 * - Creates or updates user
 * - Returns JWT
 */
const zaloLogin = async (req, res) => {
  try {
    const { accessToken, name, avatarUrl } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Thiếu accessToken' });
    }

    // Verify token with Zalo API (with appsecret_proof)
    const appSecretProof = crypto
      .createHmac('sha256', process.env.ZALO_APP_SECRET_KEY)
      .update(accessToken)
      .digest('hex');

    const zaloRes = await axios.get('https://graph.zalo.me/v2.0/me', {
      params: { fields: 'id,name,birthday,picture' },
      headers: {
        access_token: accessToken,
        appsecret_proof: appSecretProof,
      },
    });

    const zaloId = zaloRes.data?.id;
    if (!zaloId) {
      return res.status(401).json({ message: 'Token Zalo không hợp lệ' });
    }

    // Only allow 2 registered users
    const allowedIds = [
      process.env.USER_LOC_ZALO_ID,
      process.env.USER_DUONG_ZALO_ID,
    ].filter(Boolean);

    if (allowedIds.length > 0 && !allowedIds.includes(zaloId)) {
      return res.status(403).json({ message: 'Tài khoản không được phép truy cập' + zaloId });
    }

    // Upsert user
    const user = await User.findOneAndUpdate(
      { zaloId },
      {
        zaloId,
        name: name || zaloRes.data?.name || 'Unknown',
        avatarUrl: avatarUrl || zaloRes.data?.picture?.data?.url || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = signToken(user);

    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Zalo login error:', error.message);
    res.status(500).json({ message: 'Lỗi đăng nhập', error: error.message });
  }
};

/**
 * POST /api/auth/register
 * Body: { phone, password, name }
 */
const register = async (req, res) => {
  try {
    const { phone, password, name } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({ message: 'Thiếu phone, password hoặc name' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const allowedPhones = [
      process.env.USER_LOC_PHONE,
      process.env.USER_DUONG_PHONE,
      process.env.USER_TESTER_PHONE,
    ].filter(Boolean);

    if (allowedPhones.length === 0) {
      return res.status(403).json({ message: 'Chưa cấu hình số điện thoại được phép' });
    }

    if (!allowedPhones.includes(phone)) {
      return res.status(403).json({ message: 'Số điện thoại không được phép đăng ký' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: 'Số điện thoại đã đăng ký' });
    }

    const user = await User.create({
      phone,
      password,
      name,
      authProvider: 'phone',
    });

    const token = signToken(user);

    res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Lỗi đăng ký', error: error.message });
  }
};

/**
 * POST /api/auth/login
 * Body: { phone, password }
 */
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Thiếu phone hoặc password' });
    }

    const user = await User.findOne({ phone, authProvider: 'phone' });
    if (!user) {
      return res.status(401).json({ message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    const token = signToken(user);

    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Lỗi đăng nhập', error: error.message });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
      notificationEnabled: req.user.notificationEnabled,
    },
  });
};

/**
 * PATCH /api/auth/notification
 * Body: { enabled: boolean }
 */
const updateNotification = async (req, res) => {
  const { enabled } = req.body;
  req.user.notificationEnabled = !!enabled;
  await req.user.save();
  res.json({ notificationEnabled: req.user.notificationEnabled });
};

/**
 * DELETE /api/auth/me
 * User-initiated account deletion.
 */
const deleteAccount = async (req, res) => {
  try {
    await deleteUserData(req.user._id.toString());
    res.json({ message: 'Tài khoản đã được xoá thành công' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ message: 'Lỗi xoá tài khoản', error: error.message });
  }
};

module.exports = { zaloLogin, register, login, getMe, updateNotification, deleteAccount };
