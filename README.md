# Learn Vocab – deploy bằng GitHub + Netlify

## Cấu trúc
```
learn-vocab/
├─ public/index.html              ← giao diện app (file bạn vẫn chỉnh sửa)
├─ netlify/functions/progress.mjs ← API lưu tiến độ theo tên tài khoản (Netlify Blobs, kho "Default")
├─ netlify.toml                   ← cấu hình Netlify (publish = public)
├─ package.json                   ← khai báo thư viện @netlify/blobs
└─ .gitignore
```

## Cài đặt (làm 1 lần)
1. Vào github.com → **New repository** (đặt tên bất kỳ, để Private cũng được) → Create.
2. Trong repo vừa tạo: **Add file → Upload files**, kéo TOÀN BỘ nội dung thư mục `learn-vocab`
   (thư mục `public`, `netlify`, và các file `package.json`, `netlify.toml`, `.gitignore`) vào → **Commit changes**.
   Kiểm tra trên GitHub thấy đủ `public/index.html` và `netlify/functions/progress.mjs`.
3. Vào app.netlify.com → **Add new site → Import an existing project → GitHub** → chọn repo.
   Không cần điền Build command; Netlify tự đọc `netlify.toml`. Bấm **Deploy**.
4. Kiểm tra API: mở `https://<tên-site>.netlify.app/api/progress?name=test`
   → thấy `{"progress":null}` là hàm đã chạy. (Trong Netlify: tab **Functions** có `progress`.)
5. Mở app, nhập tên tài khoản ở trang chủ → bấm Đăng nhập → thấy "✓ Đã đồng bộ".

## Cập nhật sau này
Vào repo GitHub → mở `public/index.html` → bút chì (Edit) hoặc **Add file → Upload files** để thay file mới → Commit.
Netlify tự deploy lại sau ít phút.

## Lưu ý quan trọng khi chuyển từ site kéo-thả cũ
- Tiến độ trên máy (localStorage) gắn với **địa chỉ site**. Site mới có địa chỉ khác thì tiến độ cũ không tự sang.
- Nếu đang dùng địa chỉ dạng `ten-cu.netlify.app`: có thể đổi tên (Site configuration → Change site name) của site cũ
  sang tên khác, rồi đặt đúng `ten-cu` cho site mới → trình duyệt coi là cùng địa chỉ và giữ nguyên tiến độ.
