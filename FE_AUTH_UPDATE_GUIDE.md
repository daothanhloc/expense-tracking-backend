# FE Auth Migration Guide — Phone + Password

## Thay đổi chính

| Trước | Sau |
|---|---|
| Đăng nhập bằng Zalo SDK (accessToken) | Đăng nhập bằng SĐT + mật khẩu |
| `POST /auth/zalo` | Tạm thời **đã tắt** (404) |
| Chỉ cần 1 bước login | Cần **Register** trước, rồi **Login** sau |

**Tất cả endpoint khác (groups, transactions, fund) không thay đổi.** JWT token vẫn dùng `Authorization: Bearer <token>` như cũ.

---

## Luồng mới

### Lần đầu (Register)

```
1. User nhập SĐT + mật khẩu + tên
2. POST /api/auth/register { phone, password, name }
   → Nhận JWT token
3. Lưu token, dùng như cũ
```

### Lần sau (Login)

```
1. User nhập SĐT + mật khẩu
2. POST /api/auth/login { phone, password }
   → Nhận JWT token
3. Lưu token, dùng như cũ
```

---

## Chi tiết API

### `POST /api/auth/register` — Đăng ký

```json
// Request
{
  "phone": "0912345678",
  "password": "matkhau123",
  "name": "Nguyễn Văn A"
}

// Response 201
{
  "token": "eyJhbG...",
  "user": {
    "_id": "...",
    "name": "Nguyễn Văn A",
    "avatarUrl": "",
    "notificationEnabled": true,
    "phone": "0912345678"
  }
}

// Error 400 — Thiếu field hoặc mật khẩu quá ngắn
{ "message": "Thiếu phone, password hoặc name" }
{ "message": "Mật khẩu phải có ít nhất 6 ký tự" }

// Error 400 — Đã đăng ký rồi
{ "message": "Số điện thoại đã đăng ký" }

// Error 403 — SĐT không được phép
{ "message": "Số điện thoại không được phép đăng ký" }
```

### `POST /api/auth/login` — Đăng nhập

```json
// Request
{
  "phone": "0912345678",
  "password": "matkhau123"
}

// Response 200
{
  "token": "eyJhbG...",
  "user": {
    "_id": "...",
    "name": "Nguyễn Văn A",
    "avatarUrl": "",
    "notificationEnabled": true,
    "phone": "0912345678"
  }
}

// Error 400 — Thiếu field
{ "message": "Thiếu phone hoặc password" }

// Error 401 — Sai SĐT hoặc mật khẩu
{ "message": "Số điện thoại hoặc mật khẩu không đúng" }
```

---

## Endpoint không thay đổi

Các endpoint sau **hoàn toàn giữ nguyên**, chỉ cần truyền JWT token như cũ:

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/auth/me` | Lấy thông tin user |
| PATCH | `/api/auth/notification` | Bật/tắt thông báo |
| * | `/api/groups/*` | Tất cả group endpoints |
| * | `/api/transactions/*` | Tất cả transaction endpoints |
| * | `/api/fund/*` | Tất cả fund endpoints |

---

## Thay đổi cần làm ở FE

1. **Xoá Zalo SDK login** — `POST /auth/zalo` đã tắt, không gọi nữa
2. **Tạo màn hình Register** — form nhập `phone` + `password` + `name`, gọi `POST /api/auth/register`
3. **Tạo màn hình Login** — form nhập `phone` + `password`, gọi `POST /api/auth/login`
4. **Logic lưu token** — giữ nguyên, response format tương tự (`{ token, user }`)
5. **Logic check user đã register chưa** — Nếu user chưa register (chưa có token lưu), cho vào màn Register. Nếu đã register rồi (đã đăng ký trước đó), cho vào màn Login
6. **Hiển thị user** — object `user` response thêm field `phone`, các field khác giữ nguyên

---

## Gợi ý UI flow

```
App mở
  → Có token lưu?
    → Có: Dùng token, vào main app
    → Không: Hiển thị màn Login
              → Có nút "Đăng ký" chuyển sang màn Register
              → Register xong tự nhận token, vào main app
```
