const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth');
const { groupAccess } = require('../middlewares/groupAccess');
const { zaloLogin, getMe, updateNotification } = require('../controllers/authController');
const {
  createGroup,
  joinGroup,
  getMyGroups,
  getGroupDetail,
  leaveGroup,
} = require('../controllers/groupController');
const {
  parseInput,
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getStats,
} = require('../controllers/transactionController');
const {
  getFund,
  getFundMonth,
  contribute,
  getContributions,
} = require('../controllers/fundController');

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/zalo:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập bằng Zalo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accessToken]
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Zalo access token từ client SDK
 *               name:
 *                 type: string
 *                 description: Tên hiển thị (tuỳ chọn)
 *               avatarUrl:
 *                 type: string
 *                 description: URL avatar (tuỳ chọn)
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token Zalo không hợp lệ
 *       403:
 *         description: Tài khoản không được phép
 *       500:
 *         description: Lỗi server
 */
router.post('/auth/zalo', zaloLogin);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Lấy thông tin user hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token không hợp lệ
 */
router.get('/auth/me', authenticate, getMe);

/**
 * @openapi
 * /auth/notification:
 *   patch:
 *     tags: [Auth]
 *     summary: Bật/tắt thông báo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enabled]
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificationEnabled:
 *                   type: boolean
 *       401:
 *         description: Token không hợp lệ
 */
router.patch('/auth/notification', authenticate, updateNotification);

// ─── Groups ───────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /groups:
 *   post:
 *     tags: [Groups]
 *     summary: Tạo nhóm mới
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Gia đình mình
 *     responses:
 *       201:
 *         description: Tạo nhóm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *       401:
 *         description: Token không hợp lệ
 */
router.post('/groups', authenticate, createGroup);

/**
 * @openapi
 * /groups/join:
 *   post:
 *     tags: [Groups]
 *     summary: Tham gia nhóm bằng mã mời
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inviteCode]
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 example: A1B2C3
 *     responses:
 *       200:
 *         description: Tham gia thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *       400:
 *         description: Đã ở trong nhóm hoặc thiếu mã mời
 *       404:
 *         description: Mã mời không hợp lệ
 */
router.post('/groups/join', authenticate, joinGroup);

/**
 * @openapi
 * /groups:
 *   get:
 *     tags: [Groups]
 *     summary: Lấy danh sách nhóm đã tham gia
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách nhóm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
 *       401:
 *         description: Token không hợp lệ
 */
router.get('/groups', authenticate, getMyGroups);

/**
 * @openapi
 * /groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Chi tiết nhóm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Chi tiết nhóm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *       403:
 *         description: Không thuộc nhóm
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.get('/groups/:id', authenticate, getGroupDetail);

/**
 * @openapi
 * /groups/{id}/leave:
 *   post:
 *     tags: [Groups]
 *     summary: Rời nhóm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Đã rời nhóm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Đã rời nhóm
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.post('/groups/:id/leave', authenticate, leaveGroup);

// ─── Transactions (require groupId) ──────────────────────────────────────────

/**
 * @openapi
 * /transactions/parse:
 *   post:
 *     tags: [Transactions]
 *     summary: AI phân tích giao dịch từ ngôn ngữ tự nhiên
 *     description: Gửi câu văn tự nhiên, AI trả về giao dịch đã parse. Cần groupId.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rawInput]
 *             properties:
 *               rawInput:
 *                 type: string
 *                 example: Mua 100k tiền xăng
 *     responses:
 *       200:
 *         description: Kết quả parse
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parsed:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     amount:
 *                       type: number
 *                       example: 100000
 *                     category:
 *                       type: string
 *                       example: Đi lại
 *                     description:
 *                       type: string
 *                       example: Tiền xăng
 *                     rawInput:
 *                       type: string
 *       422:
 *         description: Không thể phân tích nội dung
 */
router.post('/transactions/parse', authenticate, groupAccess, parseInput);

/**
 * @openapi
 * /transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Tạo giao dịch đã xác nhận
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount, category, description]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               amount:
 *                 type: number
 *                 example: 100000
 *               category:
 *                 type: string
 *                 enum: [Ăn uống, Đi lại, Nhà ở, Mua sắm, Giải trí, Sức khỏe, Khác]
 *               description:
 *                 type: string
 *                 example: Tiền xăng
 *               rawInput:
 *                 type: string
 *               goalId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *                 fund:
 *                   $ref: '#/components/schemas/FundSummary'
 */
router.post('/transactions', authenticate, groupAccess, createTransaction);

/**
 * @openapi
 * /transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: Lấy danh sách giao dịch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Lọc theo user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Ăn uống, Đi lại, Nhà ở, Mua sắm, Giải trí, Sức khỏe, Khác]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách giao dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/transactions', authenticate, groupAccess, getTransactions);

/**
 * @openapi
 * /transactions/stats:
 *   get:
 *     tags: [Transactions]
 *     summary: Thống kê giao dịch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2026-05"
 *         description: Tháng thống kê (YYYY-MM)
 *     responses:
 *       200:
 *         description: Thống kê
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 month:
 *                   type: string
 *                 totalIncome:
 *                   type: number
 *                   example: 30000000
 *                 totalExpense:
 *                   type: number
 *                   example: 25000000
 *                 net:
 *                   type: number
 *                   example: 5000000
 *                 byCategory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       total:
 *                         type: number
 *                       count:
 *                         type: integer
 *                 byUser:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       total:
 *                         type: number
 *                       count:
 *                         type: integer
 */
router.get('/transactions/stats', authenticate, groupAccess, getStats);

/**
 * @openapi
 * /transactions/{id}:
 *   patch:
 *     tags: [Transactions]
 *     summary: Cập nhật giao dịch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [Ăn uống, Đi lại, Nhà ở, Mua sắm, Giải trí, Sức khỏe, Khác]
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Không tìm thấy giao dịch
 */
router.patch('/transactions/:id', authenticate, groupAccess, updateTransaction);

/**
 * @openapi
 * /transactions/{id}:
 *   delete:
 *     tags: [Transactions]
 *     summary: Xoá giao dịch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Xoá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Đã xoá giao dịch
 *                 fund:
 *                   $ref: '#/components/schemas/FundSummary'
 *       404:
 *         description: Không tìm thấy giao dịch
 */
router.delete('/transactions/:id', authenticate, groupAccess, deleteTransaction);

// ─── Fund (require groupId) ──────────────────────────────────────────────────

/**
 * @openapi
 * /fund:
 *   get:
 *     tags: [Fund]
 *     summary: Lấy tổng quan quỹ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tổng quan quỹ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FundSummary'
 */
router.get('/fund', authenticate, groupAccess, getFund);

/**
 * @openapi
 * /fund/contributions:
 *   get:
 *     tags: [Fund]
 *     summary: Lịch sử đóng góp
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách đóng góp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contributions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contribution'
 */
router.get('/fund/contributions', authenticate, groupAccess, getContributions);

/**
 * @openapi
 * /fund/{month}:
 *   get:
 *     tags: [Fund]
 *     summary: Chi tiết quỹ theo tháng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^\d{4}-(0[1-9]|1[0-2])$
 *         description: Tháng (YYYY-MM)
 *         example: "2026-05"
 *     responses:
 *       200:
 *         description: Chi tiết quỹ tháng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 month:
 *                   type: string
 *                 totalContributed:
 *                   type: number
 *                 totalSpent:
 *                   type: number
 *                 balance:
 *                   type: number
 *                 contributions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contribution'
 *                 expenses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 */
router.get('/fund/:month', authenticate, groupAccess, getFundMonth);

/**
 * @openapi
 * /fund/contribute:
 *   post:
 *     tags: [Fund]
 *     summary: Đóng góp vào quỹ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 15000000
 *               month:
 *                 type: string
 *                 example: "2026-05"
 *                 description: Tháng đóng góp (mặc định là tháng hiện tại)
 *               note:
 *                 type: string
 *                 example: Đóng góp tháng 5
 *     responses:
 *       201:
 *         description: Đóng góp thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contribution:
 *                   $ref: '#/components/schemas/Contribution'
 *                 fund:
 *                   $ref: '#/components/schemas/FundSummary'
 *       400:
 *         description: Số tiền không hợp lệ
 */
router.post('/fund/contribute', authenticate, groupAccess, contribute);

module.exports = router;
