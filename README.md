# 💑 Couple Finance — Backend API

Backend cho ứng dụng quản lý chi tiêu đôi (Zalo Mini App).

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: Anthropic Claude API
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

### 3. Các biến môi trường cần điền

| Biến | Mô tả |
|---|---|
| `MONGODB_URI` | Connection string MongoDB Atlas |
| `ZALO_APP_ID` | App ID trên Zalo Developer Console |
| `ZALO_APP_SECRET` | App Secret |
| `ZALO_OA_TOKEN` | Token OA để gửi thông báo |
| `ANTHROPIC_API_KEY` | API key từ console.anthropic.com |
| `JWT_SECRET` | Chuỗi bí mật bất kỳ (dài ≥ 32 ký tự) |
| `USER_LOC_ZALO_ID` | Zalo ID của Lộc (lấy sau khi test login) |
| `USER_DUONG_ZALO_ID` | Zalo ID của Dương |

### 4. Chạy dev
```bash
npm run dev
```

Server chạy tại: http://localhost:3000

## API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/zalo` | Đăng nhập bằng Zalo token |
| GET | `/api/auth/me` | Thông tin user hiện tại |
| PATCH | `/api/auth/notification` | Bật/tắt thông báo |

### Transactions
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/transactions/parse` | AI phân tích text → JSON |
| POST | `/api/transactions` | Xác nhận & lưu giao dịch |
| GET | `/api/transactions` | Danh sách giao dịch |
| GET | `/api/transactions/stats` | Thống kê theo tháng |
| PATCH | `/api/transactions/:id` | Sửa giao dịch |
| DELETE | `/api/transactions/:id` | Xoá giao dịch |

### Fund (Quỹ chung)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/fund` | Số dư quỹ hiện tại |
| POST | `/api/fund/contribute` | Nạp lương vào quỹ |
| GET | `/api/fund/contributions` | Lịch sử nạp lương |
| GET | `/api/fund/:month` | Chi tiết quỹ theo tháng (YYYY-MM) |

## Luồng ghi chi tiêu (AI)

```
1. POST /api/transactions/parse  { rawInput: "Mua 100k tiền xăng" }
   → { parsed: { type, amount, category, description } }

2. User xem & confirm trên UI

3. POST /api/transactions  { type, amount, category, description, rawInput }
   → { transaction, fund }  ← Trả về cả số dư quỹ mới
```
