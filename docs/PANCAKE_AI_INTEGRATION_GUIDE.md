# TÀI LIỆU TÍCH HỢP AI — HỆ SINH THÁI PANCAKE

**Phiên bản:** 1.0 • **Kiểm tra nguồn:** 24/10/2026 • **Đối tượng:** GPT, Claude, Codex, DeepSeek, Muse và các AI Agent qua MCP/n8n.

> Đây là tài liệu tổng hợp đường dẫn và quy trình triển khai, **không phải tài liệu API thay thế nhà cung cấp**. Trước khi viết code, agent **phải đọc tài liệu gốc/OpenAPI của từng dịch vụ**, kiểm tra quyền và chỉ thử lệnh đọc. Không suy đoán tên tool/endpoint chưa được liệt kê trong tài liệu gốc.

## 1. Bảng tra cứu nhanh

| Nền tảng | MCP/REST | Mục đích | Tài liệu chuẩn |
|---|---|---|---|
| **Pancake Chat** | MCP: `https://mcp.pancake.biz/mcp` | Page, hội thoại, tin nhắn, tag, thống kê, webhook | [Hướng dẫn MCP](https://docs.pancake.biz/pancake/st-f12/st-p3?lang=en) |
| **Pancake Chat API** | `https://pages.fm/api/public_api/v2` (API theo Page); có v1 | Tích hợp chat theo mã lệnh | [API Docs](https://developer.pancake.biz/) · [OpenAPI YAML](https://developer.pancake.biz/openapi/openapi.yaml) |
| **Pancake POS MCP** | `https://mcp-pos.pancake.biz/mcp` | Trợ lý AI đọc/ghi đơn hàng, sản phẩm, kho, khách hàng | [Kết nối MCP](https://docs.pancake.biz/pos/st-f14/st-p2?lang=vi) |
| **Pancake POS API** | `https://pos.pages.fm/api/v1` | Đồng bộ POS, đặt đơn, tồn kho, khách hàng | [Open API](https://docs.pancake.biz/pos/st-f13/st-p1?lang=vi) · [Xác thực](https://docs.pancake.biz/pos/st-f13/st-p2?lang=vi) |
| **Botcake MCP** | `https://mcp.botcake.io/mcp` | Flows, khách hàng, tag, broadcast, WhatsApp Templates | [Trang kết nối](https://mcp.botcake.io/) |
| **Botcake API** | Các endpoint `https://botcake.io/api/public_api/v1/...` | Quản lý chatbot theo REST API | [API reference](https://docs.pancake.biz/botcake/st-f7/st-p2?lang=en) · [Developer](https://developers.botcake.io/#/) |
| **Botcake JSON API** | Không phải MCP endpoint; là block gọi HTTP bên ngoài | Cho chatbot truy cập AI, CRM, POS và n8n | [Hướng dẫn JSON API](https://docs.pancake.biz/botcake/st-f3/st-p3/st-s2?lang=vi) |
| **Webcake Landing MCP** | Cài `webcake-landing-mcp` qua npx hoặc dùng remote link **riêng** | Tạo/sửa landing page, thành phần, ảnh, form | [Webcake MCP](https://docs.pancake.biz/landing/st-f7/st-p3?lang=en) · [GitHub](https://github.com/vuluu2k/webcake-landing-mcp) |
| **Webcake Storefront MCP** | Xem repo và cấu hình mới nhất | Thiết kế website cửa hàng, quản lý trang | [Docs](https://docs.pancake.biz/storefront/st-f7/st-p3?lang=vi) · [GitHub](https://github.com/vuluu2k/webcake-storefront-mcp) |
| **Pancake CRM** | REST API + Webhook theo workspace | Hồ sơ khách hàng, bảng dữ liệu, bản ghi | [API Docs](https://crm.pancake.vn/developers/) · [Hướng dẫn](https://docs.pancake.biz/crm/st-f10/st-p1?lang=vi2) |
| **Storecake/Storefront** | Đồng bộ nền tảng; không đồng nghĩa mọi tính năng có public REST API | Website bán hàng liên kết POS/Webcake/Botcake | [Giới thiệu](https://docs.pancake.biz/storecake/intro) |

**Chưa xác nhận có public API/MCP độc lập** cho Fintab, Pancake Work; phải kiểm tra với nhà cung cấp, **không tự giả lập endpoint**.

## 2. Pancake Chat — đọc hội thoại và tin nhắn

**MCP URL:** `https://mcp.pancake.biz/mcp`  
**Nguồn chuẩn:** https://docs.pancake.biz/pancake/st-f12/st-p3?lang=en

- Theo tài liệu hiện tại: 31 REST endpoints, 5 webhook events (`messaging`, `conversation`, `post`, `subscription`, `connect_status`).
- `User access token`: tác vụ cấp tài khoản; tối đa 90 ngày.
- `Page access token`: tác vụ cấp Page; tài liệu nêu không hết hạn.
- Headers MCP: `X-Pancake-Page-Access-Token`, `X-Pancake-User-Access-Token`, `X-Pancake-Page-Id` và `X-Pancake-Read-Only: true`.
- Dùng `auth_status` để xác nhận phiên kết nối/token. **Thử đọc trước**, ví dụ danh sách cuộc hội thoại.
- OpenAPI machine-readable: https://developer.pancake.biz/openapi/openapi.yaml. Agent phải lấy YAML mới nhất để xem path/params/schema trước khi gọi REST.
- Không gửi tin nhắn thật, đổi tag hoặc xóa dữ liệu khi chưa được duyệt. Luôn kiểm tra giới hạn tốc độ trong docs hiện hành.

Ví dụ MCP **chỉ đọc** (token lấy từ kho bí mật của AI client, KHÔNG thay trực tiếp token thật vào tài liệu công khai):

```json
{
  "mcpServers": {
    "pancake-api": {
      "url": "https://mcp.pancake.biz/mcp",
      "headers": {
        "X-Pancake-Page-Access-Token": "REPLACE_WITH_SECRET",
        "X-Pancake-Read-Only": "true"
      }
    }
  }
}
```

> Cấu trúc JSON ở trên là ví dụ cho client hỗ trợ cấu hình kiểu `mcpServers`. Mỗi ứng dụng (Codex, Claude Code, n8n...) có cú pháp riêng — theo docs, **không copy nguyên xi vào mọi client**.

## 3. Pancake POS — đơn hàng, sản phẩm, kho, doanh thu

**MCP:** `https://mcp-pos.pancake.biz/mcp`  
**REST:** `https://pos.pages.fm/api/v1`  
Docs: https://docs.pancake.biz/pos/st-f13/st-p1?lang=vi và https://docs.pancake.biz/pos/st-f14/st-p2?lang=vi

- Tạo key: POS → Cấu hình → Nâng cao → Kết nối bên thứ 3 → Webhook - API → API Key.
- **Rủi ro cao:** theo docs, API key POS có quyền tương đương admin và không giới hạn giảm quyền. Không cấp thẳng cho agent không tin cậy.
- MCP có thể dùng header `X-Api-Key`; Claude Desktop có luồng authorize riêng.
- REST API trong docs mẫu dùng `api_key` trong query string. Với middleware, che toàn bộ URL chứa key khỏi log; không đưa vào issue, PR hoặc câu chat.
- Khởi đầu: chỉ đọc sản phẩm, tồn kho, báo cáo. Đơn thật, thay giá, cập nhật kho, huỷ đơn phải có duyệt và audit log.

Ví dụ gọi thử bằng client bảo mật: `GET https://pos.pages.fm/api/v1/shops?api_key=YOUR_API_KEY`. **Không chạy ví dụ với token thật trong log/công cụ chat.**

## 4. Botcake — AI chatbot & WhatsApp

**MCP:** `https://mcp.botcake.io/mcp`  
Trang cài đặt: https://mcp.botcake.io/

- Theo cập nhật chính thức 07/07/2026, Botcake MCP có 49 công cụ: flows, contacts, tags, sequences, broadcasts, analytics, WhatsApp templates, marketing messages.
- MCP dùng header `x-api-key`; có thể cố định Page bằng `X-Botcake-Page-Id`.
- REST API: https://docs.pancake.biz/botcake/st-f7/st-p2?lang=en (token riêng của Botcake; không dùng token POS/Webcake).
- JSON API block: https://docs.pancake.biz/botcake/st-f3/st-p3/st-s2?lang=vi. Dùng gọi n8n/AI API từ chatbot và lưu kết quả vào Custom Field.
- JSON API block hỗ trợ GET, POST, DELETE; **không mặc định hỗ trợ PUT/PATCH**. Nếu cần, dùng middleware riêng.
- BotcakeAI còn có hướng dẫn cấu hình MCP tool bên trong AI Agent: https://docs.pancake.biz/botcake/st-f2/st-p10/st-s2?lang=vi.
- Broadcast/marketing message/gửi flow tới khách thật: cần phê duyệt rõ phạm vi đối tượng, nội dung và giờ gửi.

Ví dụ cấu hình botcake MCP cho client tương thích:

```json
{
  "mcpServers": {
    "botcake": {
      "url": "https://mcp.botcake.io/mcp",
      "headers": {
        "x-api-key": "REPLACE_WITH_SECRET"
      }
    }
  }
}
```

## 5. Webcake Landing — AI làm landing page thật

**Docs:** https://docs.pancake.biz/landing/st-f7/st-p3?lang=en  
**Source:** https://github.com/vuluu2k/webcake-landing-mcp

Theo tài liệu, cách cài trên máy chạy AI client:

```bash
npx -y webcake-landing-mcp install
```

Chọn `prod`, đăng nhập Webcake qua trình duyệt và chọn IDE/AI phù hợp. Đối với remote connector, vào https://webcake.io/mcp-remote để lấy **đường dẫn riêng đã chứa mã xác thực**. **KHÔNG đăng đường dẫn riêng đó lên GitHub hoặc chia sẻ công khai.**

Nhiệm vụ phù hợp: tạo trang, sửa section, cập nhật text/ảnh/CTA/form, bố cục mobile, kiểm tra trang, tạo slider nếu schema phiên bản hiện tại hỗ trợ. **Agent phải liệt kê tools và schema thực có, không suy đoán tên tool hoặc các trường payload.**

**Luồng an toàn:** lấy thông tin sản phẩm → soạn nội dung → tạo trang nháp → đọc lại cấu trúc → kiểm tra mobile/form → gửi link xem trước → chờ duyệt → mới publish. Không sửa landing page đang chạy khi chưa xác nhận đúng page ID.

**Lỗi hay gặp:** `missing or unknown mcp-session-id` nghĩa là phiên MCP không hợp lệ/chưa initialize; `401` nghĩa là xác thực thất bại ở một lớp. `Connected` ở tầng transport không chứng minh đọc/ghi dữ liệu Webcake thành công.

## 6. Webcake Storefront — website nhiều sản phẩm

**Docs:** https://docs.pancake.biz/storefront/st-f7/st-p3?lang=vi  
**Source:** https://github.com/vuluu2k/webcake-storefront-mcp

Phù hợp trang cửa hàng, danh mục sản phẩm, thiết kế website; hệ sinh thái có cơ chế đồng bộ POS và Webcake Landing. MCP Storefront **khác** MCP Landing; phải cài/cấp quyền theo hướng dẫn repo đang dùng. Không suy đoán nó hỗ trợ cùng bộ tools hay token.

## 7. Pancake CRM — khách hàng và dữ liệu bán hàng

**Docs:** https://crm.pancake.vn/developers/  
**Hướng dẫn:** https://docs.pancake.biz/crm/st-f10/st-p1?lang=vi2

Có API và webhook; tài liệu nêu đường dẫn v2 dạng `https://crm.pancake.vn/api/workspaces/{WORKSPACE_ID}/...`. Agent cần đọc schema mới nhất và xác nhận workspace/table/field trước khi tạo hoặc cập nhật bản ghi. Không đưa tên, điện thoại, địa chỉ của khách hàng vào GitHub Issue công khai.

## 8. Kiến trúc điều phối AI đề xuất

```text
WhatsApp hoặc Form nội bộ (yêu cầu từ chủ shop)
  └─> n8n / AI Gateway (xác thực, queue, phân quyền, ghi log)
       ├─> AI bộ não (lập kế hoạch và phân công)
       ├─> AI phản biện/soạn nội dung
       ├─> Pancake Chat MCP (đọc chat; gửi tin nhắn chỉ khi cho phép)
       ├─> Pancake POS MCP (đọc kho/đơn; ghi khi được duyệt)
       ├─> Botcake MCP (quản lý flow)
       ├─> Webcake Landing MCP (tạo/sửa nháp)
       ├─> Webcake Storefront MCP (website)
       └─> Pancake CRM API (hồ sơ khách)
  └─> GitHub: source code + issue + PR + nhật ký KHÔNG chứa PII/token
  └─> Kết quả / yêu cầu duyệt gửi lại chủ shop
```

**Lưu ý:** Sơ đồ là **kiến trúc đề xuất**, không phải hệ thống đang kết nối hoàn chỉnh. Muse/WhatsApp cá nhân không mặc nhiên có API công khai cho AI khác gọi ngược vào cuộc trò chuyện. Nếu muốn WhatsApp hoạt động như kênh webhook hai chiều, phải xác minh WhatsApp Business Platform hoặc connector phù hợp.

## 9. Quy tắc bắt buộc cho AI Agent

1. Khi nhận yêu cầu tích hợp: xác định nền tảng, account/page/shop/workspace, loại tác vụ và mức tác động.
2. Đọc docs chính thức và các OpenAPI/spec gần nhất; liệt kê cụ thể tool/endpoint có thật trước khi code.
3. Thử kết nối + **lệnh đọc**; báo `200/401/403/429` theo tầng, không bịa kết quả.
4. Không yêu cầu người dùng dán token trong chat; token nằm ở secret manager / n8n Credentials / environment variables bảo vệ, không ở file Markdown.
5. POS key có quyền admin: dùng gateway hạn chế operation, audit, allowlist, rate-limit, idempotency.
6. Khi xử lý webhook: xác minh nguồn chữ ký nếu nhà cung cấp hỗ trợ, chống lặp `event_id`, queue/retry/backoff.
7. Mọi tác vụ **chi tiền quảng cáo, broadcast, gửi tin hàng loạt, tạo/huỷ đơn thật, sửa giá, publish landing page, thay đổi production** đều cần bước duyệt xác nhận rõ.
8. Chế độ thử nghiệm: chỉ tạo bản nháp và sử dụng dữ liệu giả/trang test khi có thể; không tác động trang, đơn và chat thật.
9. Không can thiệp vào VPS/port/game HieuSRO; mọi dịch vụ mới phải được triển khai độc lập và kiểm tra tài nguyên trước.
10. Phân biệt **đã kết nối MCP** / **đã xác thực** / **đã đọc dữ liệu thành công** / **đã thực thi thành công**.

## 10. Checklist kiểm thử lần đầu (không gây thay đổi dữ liệu)

- [ ] Kết nối Pancake Chat MCP → `auth_status` → đọc danh sách Page hoặc cuộc hội thoại.
- [ ] Kết nối Pancake POS MCP → đọc shop + một sản phẩm và tồn kho.
- [ ] Kết nối Botcake MCP → đọc danh sách flow/tag.
- [ ] Kết nối Webcake MCP → đọc danh sách landing pages hoặc cấu trúc page nháp.
- [ ] Đọc Webcake Storefront theo quyền được cấp (nếu dùng).
- [ ] Đọc CRM bảng/field (nếu dùng).
- [ ] Bật log lỗi đã ẩn secrets; xác nhận endpoint khi đổi môi trường.
- [ ] Cấu hình yêu cầu phê duyệt cho mọi operation ghi.
- [ ] Gửi kết quả kiểm thử: tác vụ, API/MCP, status code, thời điểm, bằng chứng, bước tiếp theo.

## 11. Prompt giao cho AI khác

> Hãy đọc đầy đủ tài liệu này. Mục tiêu là thiết kế một AI Gateway quản lý bán hàng đa kênh bằng Pancake Chat, POS, Botcake, Webcake Landing/Storefront, CRM và n8n. Trước tiên, đối chiếu các nguồn API/MCP chính thức được dẫn, kiểm tra tool và schema mới nhất, đưa ra ma trận khả năng xác thực/đọc/ghi theo từng nền tảng. Sau đó lên kiến trúc module hoá có phân quyền, secret manager, queue, logging, approval, webhook và GitHub CI/CD. Không giả định đã có API key, không tự tạo đơn/gửi tin/publish hoặc chi tiền. Chỉ triển khai bản đọc dữ liệu hoặc bản nháp cho đến khi chủ sở hữu duyệt.

---

**Nguồn tham chiếu ưu tiên:** các liên kết docs chính thức ở bảng đầu; mã nguồn mở của các gói MCP chỉ mang tính tham khảo triển khai. Khi tài liệu này và docs nhà cung cấp khác nhau, ưu tiên docs mới nhất và báo phần thay đổi.


## 12. META FACEBOOK ADS — MCP CHÍNH THỨC + Marketing API

**META ADS MCP CHÍNH THỨC DO META HOST**: `https://mcp.facebook.com/ads` — **khác Pancake MCP**. Đọc [Meta Ads MCP overview](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview) và [hướng dẫn kết nối](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started).

- Hỗ trợ các tác vụ đọc báo cáo/insights, tạo/chỉnh sửa Campaign, Ad Set, Ad, creative, audience/catalog, Pixel/dataset, test và nhật ký — **danh sách tools thực tế tùy tài khoản & rollout**.
- Meta-hosted MCP hỗ trợ đăng nhập OAuth của Meta, không bắt người dùng dán API key vào chat. Một số AI client được Meta hỗ trợ trực tiếp; **để dùng với Muse, n8n hoặc app riêng cần xác minh hỗ trợ OAuth/redirect và có thể cần tạo Meta Developer App theo hướng dẫn nhà cung cấp**. Chỉ có URL không đảm bảo kết nối được.
- **Meta Business Suite → Settings → Integrations → Ads MCP server** (nếu menu hiện trên tài khoản): người có quyền đầy đủ có thể đặt rules cho phép/chặn loại thao tác, giới hạn ngân sách hoặc thay đổi. Khởi đầu nên chỉ **đọc**.
- Trước khi cho AI tạo camp, đặt trạng thái **PAUSED** và bước duyệt độc lập cho mọi kích hoạt quảng cáo, đổi ngân sách/targeting và sửa camp đang chạy. Không tin vào prompt như lớp bảo vệ duy nhất.
- Nếu xuất hiện `is_ads_mcp_enabled: false` hoặc bị từ chối OAuth, **không thử lấy cookie/scrape**; kiểm tra rollout, client support và quyền tài khoản trước.

**Chi tiết đầy đủ:** [Meta Ads MCP + Marketing API v26.0, cách nối n8n/Muse/Webcake/GitHub, xác thực và approval](./META_MARKETING_API_AI_CAMPAIGN_GUIDE.md).

**Dự phòng khi client không kết nối MCP chính thức:** Meta Marketing API REST theo docs Meta hoặc self-host [getmcpads-com/meta-ads-mcp-server](https://github.com/getmcpads-com/meta-ads-mcp-server) (bên thứ ba, phải tự audit source trước khi cho quyền ghi). Không dùng token ở repo công khai.
