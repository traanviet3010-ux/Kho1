# Webcake Landing MCP — quy trình an toàn

Nguồn:
- https://github.com/vuluu2k/webcake-landing-mcp/blob/main/docs/tools.md
- https://github.com/vuluu2k/webcake-landing-mcp/blob/main/docs/element-specials-reference.md
- https://docs.pancake.biz/landing/st-f7/st-p3?lang=vi

## Khởi tạo
1. Kết nối MCP và kiểm tra quyền đọc/ghi; không chia sẻ remote URL có token.
2. Đọc get_generation_guide, list_elements, get_page_schema và get_element cho từng loại phần tử. Tin vào schema thực tế, không đoán tool/field.
3. Clone bằng ingest_url hoặc ingest_html khi được MCP hỗ trợ; chọn intent clone và detail full nếu schema hỗ trợ.
4. Nếu ingest trả về source/canvas_summary, giữ lại hình học gốc, đặc biệt absolute canvas builders. Nếu truncated, chia section đọc tiếp.
5. Xử lý ảnh/font từ tài sản được phép, dùng upload_images nếu có, kiểm tra lại URL tài sản thực.
6. Chuẩn bị source với new_page_skeleton/new_element/layout, sau đó validate_page.

## Lưu nháp và không xuất bản
- Thử dry_run:true để kiểm tra payload trước.
- Khi được phép tạo nháp: create_page(source, dry_run:false, publish:false) theo schema thực; luôn truyền publish:false.
- Có nhiều organizations thì kiểm tra đúng ID; không tự chọn đại.
- Trang dài: skeleton + add_section nhiều lô, validate từng phần.
- Sửa trang đã tồn tại: get_page, kiểm tra source_version, patch_page từng phần; tránh ghi đè sửa đổi gần nhất.
- publish_page phải được anh duyệt rõ ràng. Không tự publish chỉ để chụp screenshot.

## Các thành phần khó
- Slider/carousel: đúng child slides, navigation, dots, autoplay/interval/loop và swipe.
- Popup: đúng trigger và close actions, không chỉ render hình tĩnh.
- Form/CTA: phải là phần tử native có validation/interaction hợp lệ; không dùng mã tracking/form action của site bên thứ ba.
- Icons/font: ưu tiên asset nguồn + SVG/element hỗ trợ.
- Với đồ họa khó: HTML box chỉ khi phù hợp, không thay form/button tương tác bằng ảnh tĩnh.
- Nếu thiếu công cụ/browser preview hoặc không tái tạo được script, ghi blocker và UNVERIFIED.

## Nghiệm thu
Trả về page_id, editor link thật, validate errors/warnings, mapping inventory->Webcake element, screenshot desktop/mobile + QA report; tuyệt đối không lộ token/jwt.
