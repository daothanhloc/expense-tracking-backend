# Expense Tracking — Backend API

Backend cho ứng dụng quản lý chi tiêu theo nhóm (Zalo Mini App).

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: OpenRouter (Claude Haiku)
- **Auth**: Zalo OAuth + JWT

## Setup

### 1. Cài dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
# Điền các giá trị vào .env
```

### 3. Các biến môi trường

| Biến | Mô tả |
|---|---|
| `PORT` | Port server (default: 3000) |
| `NODE_ENV` | `development` hoặc `production` |
| `MONGODB_URI` | Connection string MongoDB |
| `ZALO_APP_ID` | App ID trên Zalo Developer Console |
| `OPENROUTER_API_KEY` | API key từ openrouter.ai |
| `LLM_MODEL` | Model name (default: `claude-haiku-4-20250514`) |
| `JWT_SECRET` | Chuỗi bí mật (≥ 32 ký tự) |
| `JWT_EXPIRES_IN` | Token expiry (default: `30d`) |
| `USER_LOC_ZALO_ID` | Zalo ID user 1 |
| `USER_DUONG_ZALO_ID` | Zalo ID user 2 |

### 4. Chạy dev

```bash
npm run dev
```

Server: `http://localhost:3000`
Swagger docs: `http://localhost:3000/api-docs` (chỉ hoạt động khi `NODE_ENV=development`)

## API Endpoints

### Auth

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/zalo` | Đăng nhập bằng Zalo token |
| GET | `/api/auth/me` | Thông tin user hiện tại |
| PATCH | `/api/auth/notification` | Bật/tắt thông báo |

### Groups

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/groups` | Tạo nhóm mới |
| POST | `/api/groups/join` | Tham gia nhóm bằng mã mời |
| GET | `/api/groups` | Danh sách nhóm đã tham gia |
| GET | `/api/groups/:id` | Chi tiết nhóm |
| POST | `/api/groups/:id/leave` | Rời nhóm |

### Transactions (yêu cầu `groupId`)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/transactions/parse` | AI phân tích text → JSON |
| POST | `/api/transactions` | Tạo giao dịch |
| GET | `/api/transactions` | Danh sách giao dịch |
| GET | `/api/transactions/stats` | Thống kê theo tháng |
| PATCH | `/api/transactions/:id` | Sửa giao dịch |
| DELETE | `/api/transactions/:id` | Xoá giao dịch |

### Fund (yêu cầu `groupId`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/fund` | Số dư quỹ hiện tại |
| POST | `/api/fund/contribute` | Đóng góp vào quỹ |
| GET | `/api/fund/contributions` | Lịch sử đóng góp |
| GET | `/api/fund/:month` | Chi tiết quỹ theo tháng (YYYY-MM) |

## groupId

Transaction và Fund endpoints yêu cầu `groupId` truyền qua query param hoặc header:

```
GET /api/transactions?groupId=xxx
```
```
x-group-id: xxx
```

## Luồng ghi chi tiêu (AI)

```
1. POST /api/transactions/parse?groupId=xxx  { rawInput: "Mua 100k tiền xăng" }
   → { parsed: { type, amount, category, description } }

2. User xem & confirm trên UI

3. POST /api/transactions?groupId=xxx  { type, amount, category, description, rawInput }
   → { transaction, fund }
```

## Categories

`Ăn uống`, `Đi lại`, `Nhà ở`, `Mua sắm`, `Giải trí`, `Sức khỏe`, `Khác`
