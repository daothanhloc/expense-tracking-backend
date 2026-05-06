const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

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

    // Verify token with Zalo API
    const zaloRes = await axios.get('https://graph.zalo.me/v2.0/me', {
      params: { fields: 'id,name,picture' },
      headers: { access_token: accessToken },
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
      return res.status(403).json({ message: 'Tài khoản không được phép truy cập' });
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

    const token = jwt.sign(
      { userId: user._id, zaloId: user.zaloId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        notificationEnabled: user.notificationEnabled,
      },
    });
  } catch (error) {
    console.error('Zalo login error:', error.message);
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

module.exports = { zaloLogin, getMe, updateNotification };
