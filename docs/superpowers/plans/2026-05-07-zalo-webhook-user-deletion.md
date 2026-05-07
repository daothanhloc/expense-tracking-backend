# Zalo Webhook & User Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Zalo webhook endpoint for data deletion compliance and a user-facing DELETE account API, sharing cascading deletion logic.

**Architecture:** A single new controller (`webhookController.js`) holds the webhook handlers and the shared `deleteUserData` function. `authController.js` calls `deleteUserData` for user-initiated deletion. Routes are added to the existing router — webhook routes without auth, account deletion route with auth.

**Tech Stack:** Express.js, Mongoose 8 (MongoDB), no new dependencies.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/controllers/webhookController.js` | Create | Webhook GET handshake, POST deletion handler, shared `deleteUserData` function |
| `src/controllers/authController.js` | Modify | Add `deleteAccount` handler |
| `src/routes/index.js` | Modify | Add 3 new routes |

---

### Task 1: Create `deleteUserData` shared function + webhook GET handler

**Files:**
- Create: `src/controllers/webhookController.js`

- [ ] **Step 1: Create `src/controllers/webhookController.js`**

```javascript
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
```

- [ ] **Step 2: Verify the file loads without errors**

Run: `node -e "const m = require('./src/controllers/webhookController'); console.log(Object.keys(m))"`
Expected: `[ 'zaloWebhookVerify', 'zaloWebhookHandler', 'deleteUserData' ]`

- [ ] **Step 3: Commit**

```bash
git add src/controllers/webhookController.js
git commit -m "feat: add webhook controller with shared deleteUserData function"
```

---

### Task 2: Add `deleteAccount` to `authController.js`

**Files:**
- Modify: `src/controllers/authController.js`

- [ ] **Step 1: Add the import and handler**

Add at the top of `src/controllers/authController.js`, after the existing requires:

```javascript
const { deleteUserData } = require('./webhookController');
```

Add the `deleteAccount` handler before `module.exports`:

```javascript
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
```

Update `module.exports` to include `deleteAccount`:

```javascript
module.exports = { zaloLogin, register, login, getMe, updateNotification, deleteAccount };
```

- [ ] **Step 2: Verify the file loads**

Run: `node -e "const m = require('./src/controllers/authController'); console.log(Object.keys(m))"`
Expected: includes `deleteAccount`

- [ ] **Step 3: Commit**

```bash
git add src/controllers/authController.js
git commit -m "feat: add deleteAccount handler to authController"
```

---

### Task 3: Add routes to `src/routes/index.js`

**Files:**
- Modify: `src/routes/index.js:1-7` (imports)
- Modify: `src/routes/index.js:783-784` (end of file, before `module.exports`)

- [ ] **Step 1: Add imports**

At line 6, add `deleteAccount` to the authController destructuring:

```javascript
const { zaloLogin, register, login, getMe, updateNotification, deleteAccount } = require('../controllers/authController');
```

After line 27 (after fundController import), add:

```javascript
const {
  zaloWebhookVerify,
  zaloWebhookHandler,
} = require('../controllers/webhookController');
```

- [ ] **Step 2: Add webhook routes (no auth middleware)**

Before the Auth routes section (before `// ─── Auth`), add:

```javascript
// ─── Webhooks (no auth) ──────────────────────────────────────────────────────

router.get('/webhooks/zalo', zaloWebhookVerify);
router.post('/webhooks/zalo', zaloWebhookHandler);
```

- [ ] **Step 3: Add DELETE account route (with auth)**

After `router.patch('/auth/notification', authenticate, updateNotification);` (line ~132), add:

```javascript
/**
 * @openapi
 * /auth/me:
 *   delete:
 *     tags: [Auth]
 *     summary: Xoá tài khoản
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tài khoản đã được xoá
 *       401:
 *         description: Token không hợp lệ
 */
router.delete('/auth/me', authenticate, deleteAccount);
```

- [ ] **Step 4: Verify the server starts**

Run: `npm run dev` (then Ctrl+C after confirming startup)

Expected: Server starts without errors, `🚀 Server running on http://localhost:XXXX`

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.js
git commit -m "feat: add webhook and account deletion routes"
```

---

### Task 4: Manual smoke test

- [ ] **Step 1: Test webhook verification (GET)**

Run:
```bash
curl -s "http://localhost:3000/api/webhooks/zalo?oa_id=YOUR_ZALO_APP_ID" | jq
```

Expected: `{ "errorCode": 0, "message": "Success" }`

Test with invalid oa_id:
```bash
curl -s "http://localhost:3000/api/webhooks/zalo?oa_id=invalid" | jq
```

Expected: `{ "errorCode": 1, "message": "Invalid oa_id" }` with 403 status

- [ ] **Step 2: Test webhook event (POST)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{"event":"user.remove.info","oa_id":"YOUR_ZALO_APP_ID","user_id_by_app":"nonexistent"}' | jq
```

Expected: `{ "errorCode": 0, "message": "No data found" }`

- [ ] **Step 3: Test DELETE account (with JWT)**

Run:
```bash
TOKEN="your_jwt_token_here"
curl -s -X DELETE http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected: `{ "message": "Tài khoản đã được xoá thành công" }`

**Warning:** This actually deletes data. Only test with a disposable account.
