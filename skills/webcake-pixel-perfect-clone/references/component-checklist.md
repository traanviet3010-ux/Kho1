# Kiểm kê bắt buộc — mọi phần tử và trạng thái

Mỗi section phải được đếm và có ảnh nguồn, nội dung, vị trí desktop/mobile, kiểu chữ và trạng thái. Dùng nhãn verified / approximate / missing / unverified / not_applicable; không dùng not_applicable nếu chưa kiểm tra.

## A. Vỏ trang
- Canvas, max-width, overflow, scroll, favicon, SEO title, description, OG image, canonical, ngôn ngữ.
- Palette màu, background, gradient, shadows, opacity, z-index và breakpoints.
- Font family, nguồn font hợp lệ, weight, line-height, letter-spacing, line breaks.
- Width/height, padding/margin/grid gap, sticky/fixed/absolute, các trạng thái hover/focus.
- Loader, cookie banner, watermark, nút về đầu trang.

## B. Header và Hero
- Logo, alt text, menu/submenu, mobile hamburger, anchor links, nav state.
- Banner, countdown, thông báo, ưu đãi, tiền tệ/ngôn ngữ.
- Hero ảnh nền/overlay/crop, H1 từng dòng, subline, ảnh/video và CTA.
- Desktop/mobile khác nhau phải dựng đúng cả hai, không dùng bản desktop co lại.

## C. Section thương mại
- Tên sản phẩm, description, specs, công dụng chỉ khi có bằng chứng, gallery.
- Giá bán, giá gốc, đơn vị tiền tệ, combo, màu/size, bảng size và tình trạng còn hàng.
- Grid/card, bảng so sánh, biểu tượng trust, tabs, FAQ, accordion, gallery/carousel.
- Chính sách đổi trả, vận chuyển, COD, form, mã giảm giá, số lượng, giá ship.
- Countdown: start/end/timezone/zero state/reset; không bịa số liệu/thời hạn.
- Đánh giá thực từ nguồn hợp lệ, điểm sao, người mua, ảnh và số lượng review.

## D. Form và conversion
- Từng input tên, số điện thoại, địa chỉ, biến thể, số lượng, email, note, tỉnh/huyện.
- Field name, placeholder, required, mask/pattern, dropdown, checkbox privacy.
- Submit states: disabled/loading/error/success, chống gửi đơn trùng, validation.
- CTA button, scroll/anchor, popup, WhatsApp/Zalo, sticky bar, floating button.
- Tuyệt đối không copy webhook nhận đơn, tracking Pixel hay cookie của website bên thứ ba.

## E. Tương tác
- Popup trigger click/load/delay/scroll/exit intent, overlay, đóng/mở và z-index.
- Slider số slide, ảnh + caption, arrow/dots, loop, swipe, keyboard và auto interval.
- FAQ accordion, tabs, variation swatches, spin wheel, toast, video player.
- Success/error state sau khi submit (chỉ thử bằng môi trường test).

## F. Responsive/performance/accessibility
- So sánh 1440, 1280, 768, 420, 390 và 360px khi phù hợp.
- Tránh overflow ngang, đè chữ, sai crop, ẩn CTA, popup vượt viewport.
- Kiểm tra kích thước ảnh, lazy loading, accessibility, tap size, contrast, alt và tab order.

## Báo cáo đếm
Xuất bảng section_id, source_items, implemented_items, verified_items, approximate_items, missing_items, unverified_items, evidence, notes. Không xóa mục chưa làm hoặc coi chức năng tĩnh là đã kiểm thử.
