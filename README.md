# Shopee Landing Studio — Render

Tạo landing page HTML từ metadata công khai trên Shopee với chế độ nhập tay khi Shopee chặn truy cập tự động.

Chạy local: `pip install -r requirements.txt && python server.py` (mặc định port 8088).

Deploy: Render Web Service > repository `traanviet3010-ux/Kho1` > branch `shopee-landing-studio-render` > runtime Python > Singapore > Free > build `pip install -r requirements.txt` > start `python server.py`. Set TOOL_USER=admin và TOOL_PASSWORD bằng mật khẩu dài lưu trong Render secrets. Health: `/health`.

Xuất HTML, ZIP chứa HTML+JSON+prompt Webcake MCP. **Không hỗ trợ file .pke**. Dữ liệu có thể không lấy được nếu Shopee chặn bot. Bản này không dùng Shopee API không chính thức, không đồng bộ đơn hàng và chưa tích hợp AI generative hoặc Webcake trực tiếp.

Nhánh riêng, không thay đổi `main` hoặc dự án game.
