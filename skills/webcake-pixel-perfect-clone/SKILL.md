---
name: webcake-pixel-perfect-clone
description: Clone hoặc dựng lại landing page từ URL, HTML, ảnh chụp hoặc website tham chiếu sang Webcake với độ trung thực thị giác và hành vi tối đa. Kiểm kê tất cả section, thành phần, kích thước, font, màu, ảnh, slider, popup, form, CTA, animation, desktop/mobile; đối chiếu screenshot và chỉ báo hoàn thành sau kiểm thử. Dùng khi người dùng yêu cầu clone landing page, pixel-perfect, sao chép giao diện hoặc chuyển LadiPage/HTML/website sang Webcake.
compatibility: Cần AI client hỗ trợ Agent Skills và Webcake Landing MCP; khuyến nghị có trình duyệt/screenshot tool và Python với Pillow để đo sai khác hình ảnh.
metadata:
  author: landing-ai-workflow
  version: "1.0.0"
---

# WEBCAKE PIXEL-PERFECT CLONE — QUY TRÌNH BẮT BUỘC

## Mục tiêu, phạm vi và nguyên tắc bất di bất dịch

**Mục tiêu:** dựng một bản sao có thể chỉnh sửa trong Webcake giống tham chiếu nhất có thể về cấu trúc, thẩm mỹ, nội dung đã được cho phép và hành vi trên desktop/mobile. **Không đồng nghĩa cam kết khớp 100% trong mọi trường hợp**: mã JS đóng, yếu tố động, quyền truy cập, font/asset không được phép sử dụng, widget không được Webcake hỗ trợ hoặc nội dung bất khả dụng có thể làm bản sao khác nguồn. Phải định lượng và liệt kê trung thực phần chênh lệch.

1. **CLONE, KHÔNG REDESIGN.** Giữ nguyên trật tự section, văn bản, tỷ lệ ảnh, màu, font, căn lề, khoảng cách, icon, trạng thái tương tác và vị trí thành phần. Không tự thêm/bỏ, thay bố cục, thay sản phẩm, thay ảnh hay dịch ngôn ngữ khi chưa được yêu cầu.
2. **KHÔNG BỎ SÓT PHẦN TỬ.** Phải duyệt hết chiều dài trang và các trạng thái của popup, form, menu, slider, sticky CTA; lập *element inventory* có bằng chứng nguồn, trạng thái và mức độ hoàn tất.
3. **KHÔNG TỰ ĐOÁN.** Nếu URL không tải được, thiếu ảnh/font/JS, có chống bot hoặc không xem được mobile, nêu rõ và xin nguồn HTML/screenshot/tài sản hợp lệ nếu thiết yếu. Không tuyên bố đã kiểm tra nếu không có screenshot hoặc kết quả thực tế.
4. **KHÔNG TỰ PUBLISH.** Mặc định chỉ tạo trang NHÁP trên Webcake với `publish:false`. Dùng `dry_run:true` để xem trước thay đổi, chỉ `dry_run:false` khi được phép tạo/lưu trang nháp. Không gọi `publish_page` khi chưa có duyệt tường minh. Không thay trang gốc hoặc website đang chạy.
5. **KHÔNG DÙNG THÔNG TIN BỊA.** Giá, bảng size, rating, review, ưu đãi, thời hạn countdown, tồn kho, chính sách hoàn tiền phải có nguồn xác thực; thiếu thì đánh dấu `MISSING`, không tạo lời chứng thực giả.
6. **CHỈ SAO CHÉP TÀI SẢN CÓ QUYỀN SỬ DỤNG.** Nếu site thuộc bên thứ ba, chỉ dùng hình/logo/nội dung sau khi quyền sử dụng được xác nhận. Không nhúng mã theo dõi, token, webhook hay form đẩy dữ liệu khách về bên thứ ba. Không sao chép script độc hại, pixel theo dõi hoặc địa chỉ nhận dữ liệu của chủ site mẫu.
7. **BẮT BUỘC QA ĐỦ 2 BREAKPOINT.** Source phải có desktop và mobile rõ ràng. Không được coi responsive chỉ là co ảnh desktop xuống điện thoại.

## Đầu vào

- `reference_url` HOẶC `reference_html` HOẶC `reference_screenshots` (nhiều ảnh nối tiếp đều được).
- `target`: Webcake organization/site. Không mặc định vào trang đang chạy nếu có nhiều site.
- `mode`: mặc định `exact-clone`. `adapt` chỉ khi chủ sở hữu yêu cầu đổi thương hiệu/nội dung.
- `permission`: xác nhận quyền sử dụng ảnh/text/logo của tham chiếu (nếu là trang không thuộc chính người dùng).
- `output`: trang Webcake nháp + danh mục thành phần + báo cáo so sánh + danh sách các phần chưa tái tạo được.

Nếu đủ dữ liệu thì tiến hành; không hỏi lại các thông tin đã được đưa ra. Chỉ xin thêm dữ liệu khi cần để tránh bịa hoặc can thiệp tài khoản sai.

## Quy trình thực thi bắt buộc (không được nhảy cóc)

### P0. Khám phá công cụ và phạm vi quyền

- Liệt kê MCP tools đang thực sự hiện diện. Đọc `get_generation_guide`, `list_elements`, và `get_page_schema` của **phiên MCP được kết nối** trước khi xuất source. Đọc `get_element({type})` đối với từng loại thành phần dùng trong trang. **Không giả định tên field/tool không có trong schema đang chạy.**
- Nếu đã có Webcake MCP, xác nhận được quyền READ và có thể chọn đúng organization, page, collection; không ghi trực tiếp vào page đang có.
- Đối chiếu hướng dẫn `references/webcake-mcp.md`. Nếu tool thiếu, áp dụng đường dự phòng và ghi giới hạn; không tạo link trang giả.

### P1. Bóc tách trang tham chiếu ĐẦY ĐỦ

- URL/HTML: ưu tiên gọi `ingest_url`/`ingest_html` với `intent:'clone'`, `detail:'full'` nếu schema hỗ trợ. Nếu `source` được trả về cho absolute-canvas builders (LadiPage/Webcake) thì **giữ source nguyên mẫu để xây tiếp**, không phá hỏng hình học bằng cách tự vẽ lại. Nếu có `canvas_summary.truncated`, tải từng section với tham số được docs phiên bản hiện tại hướng dẫn.
- Chụp ảnh **full-page** desktop ở 1440 hoặc 1280px và mobile 390px (thêm 360/420px nếu nguồn dùng canvas 420), xem toàn bộ trang từ header đến footer; ưu tiên trình duyệt thực, `render_preview` khi không có browser/screenshot tool.
- Lặp lại ảnh sau khi click/mở trạng thái tương tác: menu mở, slider từng slide, dropdown/swatch chọn biến thể, popup, FAQ accordion, countdown, form validation, mua hàng, sticky CTA, thông báo thành công (không gửi đơn thật).
- Thu thập HTML/CSS/font/asset công khai được phép, copy nguyên văn text và thứ tự; ghi các phần chỉ quan sát được mà không lấy được source.
- Tạo `assets/element-inventory.json` từ `assets/element-inventory.example.json`. Mỗi element phải có: section/index, loại, text/asset, kích thước/vị trí desktop + mobile, typography/style, interactions, `source_evidence`, `status`, `notes`.
- Đọc **toàn bộ** `references/component-checklist.md`. Đếm tổng section và số node con theo loại. Không xây trước khi bảng inventory đã bao quát được phần nhìn thấy.

### P2. Ghi lại thiết kế gốc — KHÔNG nội suy kiểu cho qua

- Ghi exact font family/weight/size/line-height/letter spacing cho H1/H2/H3/body/CTA desktop/mobile; lấy `font_groups`, `typography`, `text_styles` từ ingest khi có. Kiểm tra fallback font, file font và quyền sử dụng.
- Ghi màu chính/phụ, gradient, background-image, border, radius, shadow, opacity, overlay, transforms và z-index.
- Mỗi section: chiều cao/thứ tự, padding, background, grid, chiều rộng container, tọa độ, khoảng cách hàng/cột; xác định sticky/fixed.
- Mỗi ảnh: URL gốc, file được phép sử dụng, ratio, crop/fit/object-position, kích thước thực và phiên bản mobile; ảnh nền riêng với ảnh content. Dùng ảnh nguồn thay vì stock khác. Nếu được phép, dùng `upload_images`/auto-host để giữ tài sản bền vững.
- Không thay font bằng font gần giống nếu vẫn tìm được font gốc hợp lệ; nếu phải thay, đánh dấu sai khác.

### P3. Quy hoạch Webcake rồi dựng theo thứ tự

1. Dùng `new_page_skeleton`, `new_element` và `get_element` để lấy cấu trúc hợp lệ. Chọn canvas desktop 960/1200 và mobile 360/420 theo hướng dẫn và ảnh nguồn. Nếu có `source` sẵn từ ingest thì dùng source đó làm nền.
2. Dựng đúng thứ tự: header → hero → các section ở giữa → reviews → FAQ → form/CTA → footer; popup ở mảng riêng, CTA floating/sticky đúng trạng thái.
3. Dùng native elements để nội dung, form, button, gallery/slider, countdown dễ chỉnh sửa. Chỉ dùng `html-box` cho widget đồ họa phức tạp KHÔNG tương tác nếu native không thể diễn đạt, ghi rõ giới hạn.
4. Mapping đủ: mọi inventory item phải có element ID trong Webcake; nếu không có loại tương đương, đưa vào `unmapped`, nêu vì sao. Không im lặng bỏ qua.
5. Áp dụng style desktop và mobile **riêng**. Dùng `layout` nếu tool có sẵn để tính geometry; không ép các cột desktop trên mobile.
6. Dùng đúng ảnh, background, font. Kiểm tra phản hồi upload ảnh/font; các asset thất bại phải được khắc phục trước khi nghiệm thu.
7. Xây trang dài theo lô section nếu payload quá lớn: lưu skeleton nháp, `add_section` theo batch để không timeout; lưu ổn định và tiếp tục từng phần. **Cấm tự xuất bản.**
8. Form và CTA: mapping sự kiện theo `get_element`; giữ flow logic về trạng thái, validation, thông báo, chọn sản phẩm, privacy. **KHÔNG sao chép URL endpoint của người khác** để thu thập dữ liệu khách. Nếu chưa có webhook/form nhận đơn hợp lệ của anh, để cấu hình an toàn và báo “chưa nối form”, không tuyên bố hoạt động.

### P4. Kiểm thử cấu trúc bắt buộc

- `validate_page({source})` rồi sửa **toàn bộ errors** và warnings có thể tái hiện: overflow text, off-canvas, trùng ID, thiếu `field_name`, dangling event, wrong popup target, ảnh hỏng, lệch breakpoint.
- Kiểm tra integrity: số lượng section, số lượng element, asset map, CTA map, form fields, popup, slider, thứ tự. Mọi mục `MISSING` phải có lý do trong báo cáo.
- `create_page({source, dry_run:true, publish:false})` để xem trước request theo schema thực. Chỉ khi được phép lưu bản nháp thì dùng `create_page({..., dry_run:false, publish:false})`; xác nhận thành công thật qua ID/trả về của Webcake và `get_page`.
- Nếu sửa trang cũ đã được chủ sở hữu cho phép, ưu tiên `patch_page`; `update_page` phải re-read + dùng `base_version`/đảm bảo không ghi đè sửa đổi gần nhất. Không dùng `force:true` khi chưa được chủ sở hữu đồng ý.

### P5. QA THỊ GIÁC + HÀNH VI (lặp cho đến khi đạt)

- Chụp Webcake draft/preview và reference **cùng viewport, cùng zoom, cùng dải pixel**. Nếu Webcake không render được trang chưa publish trên preview công khai, dùng chế độ xem trước trong editor hoặc công cụ render nháp được phép; **không tự publish để có screenshot**. Nếu vẫn không có screenshot, báo QA visual còn `unverified`. Tốt nhất có bản render thực, không đối chiếu ảnh designer mockup với ảnh browser.
- Desktop: 1440 × full scroll; Mobile: 390 × full scroll. Thử bổ sung 360, 420, 768 và 1280 khi responsive phức tạp. Đọc `references/visual-qa.md`.
- Với quyền chạy script/Pillow, dùng `python scripts/compare_screenshots.py reference.png webcake.png --out ./qa` để tạo ảnh diff + report. Mismatch pixels không đủ chứng minh hành vi đúng nên phải kiểm thử chức năng riêng.
- Vòng sửa theo độ ưu tiên: (1) thiếu/nhầm section (2) sai ảnh/font/content (3) chiều cao, căn lề, vị trí (4) màu/gradient/crop (5) UI state/CTA/form (6) hiệu ứng/animation (7) chi tiết 1–2px.
- **Không được dừng sau bản dựng đầu tiên** khi còn phần sai thấy được. Sau mỗi lần sửa, chụp lại và kiểm tra.
- Nếu ảnh nguồn chứa widget JS/hoạt cảnh mà không thể replicate bằng Webcake, ghi `unsupported` + ảnh minh họa, đề xuất giải pháp nhưng không tuyên bố khớp 100%.

### P6. Nghiệm thu minh bạch

Chỉ được trả lời "hoàn thành" khi thỏa **tất cả**:

- [ ] Tổng số section tham chiếu = số section đã dựng (trừ các trường hợp đã giải thích)
- [ ] Mọi thành phần trong inventory có mapping Webcake hoặc lý do chưa làm
- [ ] Nội dung/giá/số liệu/ảnh đã đối soát; không phát minh dữ liệu
- [ ] Font, typography, colors, spacings, borders, z-index, ảnh/crop và responsive được kiểm tra
- [ ] Slider, popup, menu, form, countdown, anchor, CTA, sticky/floating và sự kiện quan trọng được test (hoặc báo blocker cụ thể)
- [ ] `validate_page` có 0 errors và warnings thực sự ảnh hưởng đã sửa xong
- [ ] So sánh screenshot ít nhất desktop + mobile; kèm artefact/bằng chứng kiểm tra thực tế
- [ ] Trang Webcake đã lưu nháp thật và có page ID/editor link được xác minh (nếu người dùng yêu cầu lưu)
- [ ] **Chưa publish**; không có tác vụ tạo đơn, gửi thông tin khách hoặc quảng cáo tự động
- [ ] Báo cáo dùng khung `assets/qa-report.template.md` với bảng `exact / approximate / missing / unverified`, độ lệch còn lại, screenshot và link thật.

**Tuyệt đối không báo “clone đúng 100%” nếu chưa có đủ bằng chứng**, đặc biệt khi URL bị chặn, chưa đọc font gốc, ảnh thiếu, trang chưa render hoặc CTA/form chưa kiểm thử. Khi không có công cụ/điều kiện phù hợp, thực hiện phần đã xác minh được rồi báo rõ phần còn thiếu.

## Câu lệnh sử dụng mẫu

> Dùng skill `webcake-pixel-perfect-clone` để clone landing page **[URL]** sang Webcake. Chế độ `exact-clone`; giữ nguyên 100% thành phần quan sát được, text, font, hình, màu, thứ tự, mọi breakpoint và tính năng tương tác. Chụp/kiểm kê toàn bộ trước khi dựng. Tạo trang Webcake NHÁP, không publish; kiểm tra screenshot desktop/mobile và mọi CTA/form/slider/popup; sửa đến khi khớp tối đa. Gửi link editor thật, bảng kiểm kê số phần tử và báo cáo sai khác; không được tự bỏ qua hoặc bịa bất kỳ phần nào.

## Tài liệu đính kèm

- `references/webcake-mcp.md` — Webcake tool sequencing, schema, clone deterministic, publish guardrails.
- `references/component-checklist.md` — kiểm tra từng loại phần tử, trạng thái và tracking.
- `references/visual-qa.md` — tiêu chí screenshot/visual và chức năng.
- `references/permissions-security.md` — quyền tài sản, chống rò rỉ, live-safety.
- `assets/element-inventory.example.json` — schema kiểm kê.
- `assets/qa-report.template.md` — format báo cáo.
- `scripts/compare_screenshots.py` — diff pixel và ảnh overlay.