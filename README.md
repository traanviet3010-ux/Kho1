# REA Studio — Web tiếng Việt (Render)

Giao diện web **riêng** cho [REA](https://github.com/morluto/rea) phiên bản \`6.7.0\`. Đây là ứng dụng Node/Express không sửa mã nguồn REA. Bộ phân tích được cài từ npm chính thức \`rea-agents@6.7.0\`.

## Có thể dùng

- Trang đăng nhập một quản trị viên (ADMIN_USERNAME / ADMIN_PASSWORD), cookie HTTP-only ký HMAC.
- Dashboard tiếng Việt, drag & drop file, phân tích bất đồng bộ, danh sách tác vụ, hủy/xóa, lịch sử, tải báo cáo JSON, checksum SHA-256.
- Bộ phân tích tĩnh cho file tổng quát, .NET assembly / members, IL2CPP global-metadata.dat, Go, Rust, Electron ASAR, model GGUF / Safetensors, SQLite và Flutter APK.
- Phân tích theo hàng đợi một tác vụ tại một thời điểm. Giới hạn file mặc định 75 MB (nhận file 55 MB), giới hạn báo cáo 16 MB, timeout 180s; được cấu hình bằng environment.
- Không thực thi file tải lên; không chạy arbitrary REA CLI command do người dùng nhập.

**Chưa có:** Ghidra native provider, Hopper/IDA, JADX, Android device/ADB, browser observation và phân tích động. Những công cụ này cần worker riêng, bộ phụ thuộc đặc thù và tài nguyên lớn. File PK2 Silkroad có thể được nhận diện như artifact nhưng không mặc định giải mã toàn bộ nội dung PK2.

## Deploy Render

1. Sử dụng repository \`traanviet3010-ux/Kho1\`, branch \`rea-web-render\`.
2. Tạo **Web Service** với Runtime **Docker**; Dockerfile ở root; region Singapore.
3. Đặt \`ADMIN_USERNAME=admin\`; \`ADMIN_PASSWORD\` dài tối thiểu 12 ký tự, mạnh, không lưu vào Git; \`SESSION_SECRET\` là chuỗi ngẫu nhiên tối thiểu 32 ký tự. \`NODE_ENV=production\`.
4. Render sẽ phục vụ web qua \`https://<ten-dich-vu>.onrender.com\`. \`GET /api/health\` dùng để kiểm tra dịch vụ.

**Lưu trữ:** dữ liệu được lưu tại \`DATA_DIR\` (mặc định \`/app/runtime-data\`). Không có **Render Persistent Disk** thì file và lịch sử mất khi container bị thay thế. Để dùng thường xuyên hãy dùng gói hỗ trợ disk, mount đúng \`DATA_DIR\`, và đặt quy tắc xóa file định kỳ. Dự án không cấu hình mount disk hoặc tự động mua gói trả phí.

**Tài nguyên:** Render Free 512MB dễ thiếu RAM khi REA phân tích file lớn. Giới hạn tải 75 MB chỉ bảo đảm file được nhận; REA có thể hết RAM hoặc timeout khi xử lý file 55 MB; muốn phân tích native quy mô lớn dùng worker/VPS riêng. Upload file không tin cậy là rủi ro đáng kể dù tác vụ chạy không có đặc quyền root; chỉ dùng môi trường này cho một người quản trị đáng tin và không tải file mật lên public server.

## Chạy local

Yêu cầu Node.js 24.11+ và procps \`ps\` trên Linux.

\`\`\`bash
npm install
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='your-long-random-password'
export SESSION_SECRET='a-different-long-random-secret-at-least-32-characters'
npm start
# http://localhost:10000
\`\`\`

Kiểm tra mã nguồn: \`npm run check\`. Chạy kiểm thử: \`npm test\`.

## Cấu trúc

\`\`\`text
server.mjs         # HTTP API, authentication, job queue, REA child processes
lib.mjs            # allowlist of analysis commands and session utils
public/index.html  # Vietnamese dashboard
public/app.js      # UI, uploads, polling, results
public/style.css   # responsive layout
Dockerfile         # Node 24, procps, nonroot runtime
render.yaml        # Render Blueprint, password entered manually
\`\`\`

## Bảo mật

Không mở HTTP MCP của REA ra Internet. Web chỉ gọi CLI từ danh sách cho phép; đầu vào file được đặt tên ngẫu nhiên theo UUID, không đưa nguyên tên file vào shell. Cookie HTTP-only, SameSite Strict, CSP, giới hạn đăng nhập, Origin check cho các yêu cầu ghi, hạn chế loại và kích thước file, timeout, kill process group, giới hạn stdout. Đây không phải sandbox bảo mật hoàn chỉnh chống file độc hại; nên bổ sung cách ly worker chuyên dụng, malware scanning, quotas theo tài khoản, rate limit phân tán, lưu trữ mã hóa và audit trước khi mở cho nhiều người dùng.

REA upstream: https://github.com/morluto/rea
