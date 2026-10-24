# QA ảnh và hành vi — tiêu chuẩn pixel-perfect

## Ảnh chuẩn
1. Nguồn và clone ở cùng viewport, DPI, zoom, scroll, cookie state và sau khi tải xong ảnh/font.
2. Chụp full-page desktop 1440x900 và mobile 390x844; thêm từng section nếu ảnh quá dài.
3. Chụp các trạng thái menu, slider, dropdown, popup, FAQ, form validation, sticky CTA.
4. Chỉ mask vùng động thực sự (video/frame/countdown) và công bố mask; không mask để che lỗi.
5. Nếu không chụp được clone thực tế, đánh dấu visual QA là UNVERIFIED.

## Phép kiểm tra
- Semantic: cùng số section/order, tất cả text/ảnh/link/form/CTA.
- Geometry: bounding boxes, padding, alignment, line wraps, hero height và crop.
- Typography: đúng font, weight, size, line-height, spacing.
- Pixel: script compare_screenshots.py tạo MAE, % pixels lệch tolerance, overlay/diff; không phải thước đo độ giống tổng thể.
- Behavior: click/scroll, accordion, arrows/swipe/dots/autoplay, form error/success test, sticky.
- Assets: load ảnh nền/ảnh sản phẩm/font, không có ảnh hỏng hay asset bị thay thế.

## Vòng sửa bắt buộc
1. Ghi baseline + inventory + vấn đề, lưu ảnh gốc.
2. Khắc phục thiếu section, ảnh, font và nội dung; chụp lại.
3. Chỉnh hình học desktop và mobile độc lập; chụp lại.
4. Chỉnh typography, color, gradient, borders, shadow và overlay; chụp lại.
5. Test chức năng và các state, sửa lỗi; chụp lại.
6. Validate trên MCP. Chỉ báo complete khi hết lỗi và các phần chưa được xác minh đều ghi rõ.

Không công bố “100% giống” dựa trên cảm giác; độ giống hình ảnh và hành vi phải được kiểm chứng riêng.
