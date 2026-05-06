# FE Integration Guide — Couple Finance API

## Base URL

```
http://localhost:3000/api
```

Swagger UI: `http://localhost:3000/api-docs`

---

## Thay đổi chính so với bản cũ

| Trước | Sau |
|---|---|
| App chỉ cho 2 user cố định (Lộc & Dương) | Nhiều user, nhiều nhóm |
| `SalaryContribution` | Đổi thành `Contribution` |
| Transaction, Fund, Stats là global | Tất cả scoped theo `groupId` |
| Không có nhóm | Có Groups với mã mời (invite code) |

---

## Authentication

### Headers

Mọi request (trừ login) đều cần:

```
Authorization: Bearer <JWT token>
```

### `POST /auth/zalo` — Đăng nhập

```json
// Request
{ "accessToken": "zalo_access_token", "name": "Nguyễn Văn A", "avatarUrl": "https://..." }

// Response 200
{ "token": "eyJhbG...", "user": { "_id": "...", "name": "Nguyễn Văn A", "avatarUrl": "...", "notificationEnabled": true } }
```

### `GET /auth/me` — Lấy user hiện tại

```json
// Response 200
{ "user": { "_id": "...", "name": "...", "avatarUrl": "...", "notificationEnabled": true } }
```

### `PATCH /auth/notification` — Bật/tắt thông báo

```json
// Request
{ "enabled": false }

// Response 200
{ "notificationEnabled": false }
```

---

## Groups — QUAN TRỌNG: LUÔN CẦN GROUP

User phải tạo hoặc join group trước khi dùng được transaction/fund.

### `POST /groups` — Tạo nhóm

```json
// Request
{ "name": "Gia đình mình" }

// Response 201
{
  "group": {
    "_id": "681f...",
    "name": "Gia đình mình",
    "inviteCode": "A1B2C3",
    "members": [{ "_id": "...", "name": "...", "avatarUrl": "..." }],
    "createdAt": "2026-05-06T10:00:00.000Z"
  }
}
```

### `POST /groups/join` — Tham gia bằng mã mời

```json
// Request
{ "inviteCode": "A1B2C3" }

// Response 200
{ "group": { "_id": "...", "name": "...", "inviteCode": "A1B2C3", "members": [...] } }
```

### `GET /groups` — Danh sách nhóm đã tham gia

```json
// Response 200
{ "groups": [{ "_id": "...", "name": "...", "inviteCode": "...", "members": [...] }] }
```

### `GET /groups/:id` — Chi tiết nhóm

```json
// Response 200
{ "group": { "_id": "...", "name": "...", "inviteCode": "...", "members": [...], "createdAt": "..." } }
```

### `POST /groups/:id/leave` — Rời nhóm

```json
// Response 200
{ "message": "Đã rời nhóm" }
```

---

## groupId — Cách truyền

Mọi request liên quan đến Transaction và Fund đều **bắt buộc** truyền `groupId` qua một trong hai cách:

**Cách 1: Query param (khuyên dùng)**

```
GET /api/transactions?groupId=681f...
POST /api/transactions?groupId=681f...
```

**Cách 2: Header**

```
x-group-id: 681f...
```

Nếu thiếu `groupId` → `400 { message: "Thiếu groupId" }`

---

## Transactions

### `POST /transactions/parse?groupId=xxx` — AI parse ngôn ngữ tự nhiên

Bước 1: Gửi câu tự nhiên, AI trả về giao dịch đã parse.

```json
// Request
{ "rawInput": "Mua 100k tiền xăng" }

// Response 200
{
  "parsed": {
    "type": "expense",
    "amount": 100000,
    "category": "Đi lại",
    "description": "Tiền xăng",
    "rawInput": "Mua 100k tiền xăng"
  }
}

// Response 422 — AI không hiểu
{ "message": "Không thể phân tích nội dung. Vui lòng thử lại." }
```

### `POST /transactions?groupId=xxx` — Tạo giao dịch

Bước 2: Dùng kết quả từ parse (hoặc nhập tay) để tạo giao dịch.

```json
// Request
{
  "type": "expense",
  "amount": 100000,
  "category": "Đi lại",
  "description": "Tiền xăng",
  "rawInput": "Mua 100k tiền xăng",
  "goalId": null
}

// Response 201
{
  "transaction": {
    "_id": "...",
    "type": "expense",
    "amount": 100000,
    "category": "Đi lại",
    "description": "Tiền xăng",
    "rawInput": "Mua 100k tiền xăng",
    "createdBy": { "_id": "...", "name": "...", "avatarUrl": "..." },
    "groupId": "...",
    "goalId": null,
    "status": "confirmed",
    "createdAt": "..."
  },
  "fund": { "balance": 5000000, "totalContributed": 30000000, "totalSpent": 25000000 }
}
```

**Category values**: `Ăn uống`, `Đi lại`, `Nhà ở`, `Mua sắm`, `Giải trí`, `Sức khỏe`, `Khác`

**Type values**: `income`, `expense`

### `GET /transactions?groupId=xxx` — Danh sách giao dịch

Query params (tất cả optional trừ `groupId`):

| Param | Type | Example |
|---|---|---|
| `groupId` | string (required) | `681f...` |
| `userId` | string | Lọc theo user |
| `startDate` | date | `2026-05-01` |
| `endDate` | date | `2026-05-31` |
| `category` | string | `Ăn uống` |
| `type` | string | `expense` |
| `page` | integer | `1` (default: 1) |
| `limit` | integer | `20` (default: 20) |

```json
// Response 200
{
  "transactions": [...],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### `GET /transactions/stats?groupId=xxx` — Thống kê

| Param | Type | Example |
|---|---|---|
| `groupId` | string (required) | `681f...` |
| `month` | string | `2026-05` |

```json
// Response 200
{
  "month": "2026-05",
  "totalIncome": 30000000,
  "totalExpense": 25000000,
  "net": 5000000,
  "byCategory": [
    { "_id": "Ăn uống", "total": 8000000, "count": 15 },
    { "_id": "Đi lại", "total": 5000000, "count": 8 }
  ],
  "byUser": [
    { "name": "Nguyễn Văn A", "total": 15000000, "count": 20 },
    { "name": "Trần Thị B", "total": 10000000, "count": 12 }
  ]
}
```

### `PATCH /transactions/:id?groupId=xxx` — Cập nhật

```json
// Request (tất cả fields optional)
{ "amount": 200000, "category": "Mua sắm" }

// Response 200
{ "transaction": { ... } }
```

### `DELETE /transactions/:id?groupId=xxx` — Xoá

```json
// Response 200
{ "message": "Đã xoá giao dịch", "fund": { "balance": ..., "totalContributed": ..., "totalSpent": ... } }
```

---

## Fund

### `GET /fund?groupId=xxx` — Tổng quan quỹ

```json
// Response 200
{ "balance": 5000000, "totalContributed": 30000000, "totalSpent": 25000000 }
```

### `POST /fund/contribute?groupId=xxx` — Đóng góp

```json
// Request
{ "amount": 15000000, "month": "2026-05", "note": "Đóng góp tháng 5" }

// Response 201
{
  "contribution": {
    "_id": "...",
    "groupId": "...",
    "userId": { "_id": "...", "name": "..." },
    "amount": 15000000,
    "month": "2026-05",
    "note": "Đóng góp tháng 5",
    "createdAt": "..."
  },
  "fund": { "balance": ..., "totalContributed": ..., "totalSpent": ... }
}
```

`month` là optional, mặc định = tháng hiện tại. Mỗi user chỉ đóng góp 1 lần/tháng/nhóm (upsert).

### `GET /fund/contributions?groupId=xxx` — Lịch sử đóng góp

```json
// Response 200
{
  "contributions": [
    { "_id": "...", "userId": { "name": "...", "avatarUrl": "..." }, "amount": 15000000, "month": "2026-05", "note": "..." }
  ]
}
```

### `GET /fund/:month?groupId=xxx` — Chi tiết quỹ theo tháng

```json
// Response 200
{
  "month": "2026-05",
  "totalContributed": 30000000,
  "totalSpent": 8000000,
  "balance": 22000000,
  "contributions": [...],
  "expenses": [...]
}
```

---

## Error responses

Tất cả errors đều theo format:

```json
{ "message": "Mô tả lỗi", "error": "Chi tiết (chỉ khi 500)" }
```

| Status | Khi nào |
|---|---|
| 400 | Thiếu field, dữ liệu không hợp lệ |
| 401 | Thiếu/không hợp lệ JWT token |
| 403 | Không thuộc nhóm, không được phép |
| 404 | Không tìm thấy resource |
| 422 | AI không thể parse input |
| 500 | Lỗi server |

---

## Luồng sử dụng典型

```
1. Đăng nhập Zalo → nhận JWT token
2. Tạo nhóm (POST /groups) → nhận inviteCode
3. Chia sẻ inviteCode cho người khác
4. Người khác join (POST /groups/join)
5. Chọn group → lưu groupId vào state/storage
6. Thêm giao dịch: Parse → Confirm
7. Xem thống kê, quỹ, đóng góp (tất cả cần groupId)
```
