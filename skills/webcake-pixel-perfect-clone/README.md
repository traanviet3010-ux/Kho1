# webcake-pixel-perfect-clone v1.0.0

AI Skill (Agent Skills `SKILL.md`) để tái tạo landing page từ URL/HTML/screenshot vào Webcake với quy trình kiểm kê chi tiết + QA desktop/mobile + hành vi. Mặc định tạo **NHÁP, không xuất bản**.

## Cài đặt

Bằng npx skills (Node.js phù hợp):

```bash
npx skills add https://github.com/traanviet3010-ux/Kho1/tree/main/skills/webcake-pixel-perfect-clone
```

Hoặc giải nén thư mục `webcake-pixel-perfect-clone/` vào `.agents/skills/` (Codex/IDE tương thích) và khởi động lại AI client. Một số client dùng `.claude/skills/` hoặc cấu hình Skill riêng. **Muse chỉ dùng được khi giao diện hỗ trợ import Agent Skills/đọc SKILL.md**, không phải cứ paste link là tự cài.

## Yêu cầu thêm

- Webcake Landing MCP đã kết nối: https://github.com/vuluu2k/webcake-landing-mcp
- AI có khả năng đọc URL/screenshot/HTML của trang tham chiếu.
- Tùy chọn: Python 3 + Pillow (`python -m pip install pillow`) để so ảnh.

## Prompt thử

> Dùng skill webcake-pixel-perfect-clone để clone URL [DÁN LINK] sang Webcake, exact-clone. Bóc tách đủ mọi section/element desktop/mobile, tài sản/typography và hành vi, lập inventory trước. Chỉ tạo NHÁP bằng MCP, không publish. Validate sạch lỗi, chụp ảnh so sánh và sửa đến khi khớp tối đa, không tự bỏ phần khó. Báo cáo đúng phần hoàn tất, thiếu và link Webcake được xác minh.

**Quan trọng:** “100%” là yêu cầu mức độ nghiêm ngặt, không phải bảo đảm kỹ thuật vô điều kiện. Nếu nguồn bị giới hạn, assets thiếu quyền, script đóng hoặc Webcake không hỗ trợ hiệu ứng nào đó, phải ghi blocker và báo đúng mức tái tạo thực tế.