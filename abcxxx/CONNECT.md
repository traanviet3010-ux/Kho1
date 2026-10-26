# abcxxx — Thiết lập Custom Connector & lịch tự động

## Địa chỉ PUBLIC (DNS thường)

- MCP: https://abcxxx-gateway.onrender.com/mcp
- Tài liệu web: https://abcxxx-gateway.onrender.com/docs
- Tài liệu Markdown: https://abcxxx-gateway.onrender.com/docs.md
- REST fallback: https://abcxxx-gateway.onrender.com/v1/tool
- Trạng thái: https://abcxxx-gateway.onrender.com/healthz

Đây là tên miền Render Free không chứa địa chỉ IP. Máy chủ phía sau chỉ quản lý nhiệm vụ, lịch và báo cáo. Mỗi AI Worker tự dùng kết nối dữ liệu riêng của mình.

## Cấu hình connector

Tên: abcxxx
Host: abcxxx-gateway.onrender.com
Endpoint: /mcp
Transport: remote MCP HTTP (stateless JSON-RPC)
Auth mode: api_key
Auth placement: bearer_header
Authorization header: Bearer <PRIVATE_WORKER_TOKEN>

- Chỉ nhập token do chủ sở hữu cấp **qua hộp nhập bí mật** của ứng dụng.
- Tuyệt đối không gửi token qua chat hoặc đưa lên GitHub.
- Không dùng token của Owner/CEO cho tài khoản Worker.
- Nếu client yêu cầu OAuth mà không cho phép Bearer thủ công, báo lỗi đúng sự thật; server chưa hỗ trợ OAuth.

## Tool cho Worker

1. whoami — nhận diện vai trò thật.
2. list_due_tasks — xem nhiệm vụ đúng vai trò, mặc định status=queued.
3. get_task — đọc một nhiệm vụ.
4. claim_task — nhận nhiệm vụ, tránh nhiều tài khoản làm trùng.
5. submit_result — nộp báo cáo, kèm link bằng chứng nếu có.
6. list_schedules — xem lịch liên quan.

## Tool cho Coordinator/CEO

- create_task, create_schedule, list_schedules, set_schedule_enabled,
  get_task, list_due_tasks, team_progress, review_task, whoami.

CEO không cần đọc trực tiếp mọi nguồn dữ liệu của Worker.

## Cài lịch tự động phía tài khoản AI

Sau khi whoami trả đúng vai trò và một nhiệm vụ thử đã được giao/nhận/nộp thành công, hãy thiết lập Scheduled Task trong chính ứng dụng AI:

"Mỗi lần lịch chạy, truy cập abcxxx. Gọi whoami và list_due_tasks(status=queued). Với mỗi nhiệm vụ được giao, gọi claim_task, đọc get_task và thực hiện bằng các connector sẵn có. Khi hoàn tất, gọi submit_result gồm summary và evidence. Nếu không có nhiệm vụ thì kết thúc; không tự suy diễn dữ liệu. Tuyệt đối không tự thay đổi ngân sách, thanh toán hay gửi tin nhắn khách khi chưa được cho phép."

Gợi ý lịch thử nghiệm: 08:10 và 17:10 giờ Việt Nam mỗi ngày (lịch này CHƯA được bật trong tài khoản AI). Coordinator có thể tạo các nhiệm vụ thường hoặc định kỳ trong MCP; lịch chạy của AI phải bật riêng.

## Lưu ý kỹ thuật

- Không thể kiểm chứng Custom Connector của một tài khoản AI riêng cho đến khi tài khoản đó tự kết nối và chạy tool thực tế.
- Render Free có thể ngủ khi rảnh, có thể làm lần kết nối đầu chậm hoặc timeout; nếu cần ổn định cao, sử dụng tên miền DNS thường trỏ trực tiếp VPS.
- Relay trung gian xử lý bearer header để chuyển tiếp, vì vậy nhà cung cấp Render là một điểm TLS termination; chỉ cấp quyền Worker hạn chế.
- Không có token hay dữ liệu khách trong repo công khai.
