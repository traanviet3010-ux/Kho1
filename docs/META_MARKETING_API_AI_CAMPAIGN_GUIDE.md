# META MARKETING API — Hướng dẫn cho AI tạo, kiểm tra và quản lý Facebook Ads

**Phiên bản 1.0 — 24/10/2026**  
**Dành cho**: Muse, GPT, Claude, DeepSeek, n8n, GitHub Actions, API gateway.  
**Mục tiêu:** tạo campaign thật **ở trạng thái PAUSED**, báo chủ tài khoản kiểm tra, rồi mới được bật chạy.

> **An toàn:** Không đưa access token, App Secret, số điện thoại khách hàng, danh sách đối tượng hoặc thông tin thanh toán vào repo, Issue, prompt công khai. **Không tự kích hoạt quảng cáo, thay ngân sách, thay nhắm mục tiêu, chi tiền hoặc chỉnh sửa camp đang chạy.** Các thao tác API ghi có thể gây thay đổi thực tế kể cả khi trạng thái PAUSED. Không gọi POST khi chủ sở hữu chỉ yêu cầu đọc/tư vấn.

## BỔ SUNG QUAN TRỌNG — Meta Ads MCP chính thức (24/10/2026)

**Meta hiện cung cấp Ads MCP Server riêng**, không chỉ có REST Marketing API. Với AI client được hỗ trợ, đây là đường thử đầu tiên nên ưu tiên:

- **URL:** `https://mcp.facebook.com/ads`
- **Tài liệu chính thức:** [Overview](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview) · [Get started](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started) · [Available tools](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools) · [Rules and best practices](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-rules-best-practices)
- **Chức năng:** đọc account/campaign/insights, tạo/chỉnh sửa chiến dịch, ad set, creative và ad; tùy rollout có thể quản lý audiences, catalogs, signal/pixel datasets, experiments, activity logs. Agent phải tự liệt kê tools trong phiên đã kết nối, không giả định tất cả tools đều khả dụng.
- **Xác thực:** Meta OAuth (đăng nhập Meta). Không nhập `META_ACCESS_TOKEN` vào prompt khi dùng hosted official MCP. Meta có hỗ trợ đăng nhập sẵn với một số client thông dụng như Claude/ChatGPT/Claude Code/Perplexity; các client khác, nhất là ứng dụng do anh tự xây/n8n/Muse, có thể phải dùng Meta Developer App hỗ trợ redirect & Ads MCP theo docs mới. **Đừng khẳng định URL này chạy với Muse/n8n khi chưa kiểm thử thực tế.**
- **Dùng Claude Code:** `claude mcp add --transport http meta-ads https://mcp.facebook.com/ads`, sau đó chạy `/mcp` và đăng nhập Meta theo lời nhắc (nếu client/Meta chấp nhận).
- **Kiểm soát hành động:** nếu tài khoản đã được hỗ trợ, người có toàn quyền Business Portfolio có thể vào Meta Business Suite → Settings → Integrations → Ads MCP server để thiết lập rules chặn tạo camp, chặn tăng ngân sách hoặc đặt ngưỡng. Dùng thêm approval gate riêng. Tạo mới `PAUSED` không đồng nghĩa được phép tự tạo nếu chưa được chủ tài khoản đồng ý.
- **Kiểm thử bước đầu:** yêu cầu AI “Liệt kê tài khoản quảng cáo tôi có quyền truy cập; chỉ đọc, không tạo/sửa gì”, sau đó đọc `insights` cho một tài khoản xác định. Phân biệt lỗi đăng nhập, chưa được rollout (`is_ads_mcp_enabled: false`), thiếu quyền tài sản và lỗi tool.
- **Khác với Marketing API REST:** dùng MCP chính thức cho tương tác nhanh/reporting/nháp ít creatives; dùng REST Gateway khi cần tự chạy batch lớn, xử lý upload media/video hay tích hợp n8n theo lịch, bảo đảm versioning, queue, audit và approval.
- **MCP thay thế tự host:** [getmcpads-com/meta-ads-mcp-server](https://github.com/getmcpads-com/meta-ads-mcp-server) (độc lập với Meta, tự kiểm tra mã nguồn/credential, chỉ bật write khi đã audit). Không bắt buộc khi official MCP đã đáp ứng.

**Đề xuất cho dự án:** Muse/WhatsApp tiếp nhận ý định → bộ não AI lập kế hoạch → MCP chính thức (nếu kết nối hợp lệ) đọc/report → gateway phê duyệt → tạo/activate nếu anh cho phép. Duy trì REST API làm fallback cho những client không được Meta MCP hỗ trợ. **Không triển khai live ads hay token khi chưa xác minh môi trường thực.**

---

## 1. Nguồn chính thức (đọc trước khi triển khai)

- [Meta Marketing API overview](https://developers.facebook.com/docs/marketing-apis/)
- [Meta Marketing API authentication](https://developers.facebook.com/docs/marketing-apis/overview/authentication)
- [Meta Marketing API Postman — official workspace](https://www.postman.com/meta/facebook-marketing-api/overview) — danh sách request mẫu, cập nhật 16/10/2026.
- [Meta Marketing API Postman — collection](https://www.postman.com/meta/facebook-marketing-api/collection/0zr4mes/facebook-marketing-api-mapi)
- [Create campaign](https://www.postman.com/meta/facebook-marketing-api/request/q8owgyc/creating-campaign-l3)
- [Create ad set](https://www.postman.com/meta/facebook-marketing-api/request/exbh254/creating-adset-l2)
- [Create ad creative](https://www.postman.com/meta/facebook-marketing-api/request/2y4pkug/creating-standalone-adcreative-l-1)
- [Create ad (PAUSED)](https://www.postman.com/meta/facebook-marketing-api/request/kyc8tuh/creating-an-ad-based-on-adcreative-id-l1)
- [Ad account insights](https://www.postman.com/meta/facebook-marketing-api/request/u38qbri/get-insight-details-from-an-adaccount-l4)
- [Graph & Marketing API v26.0 changelog](https://developers.facebook.com/docs/graph-api/changelog/version26.0)
- [Meta advertising standards](https://transparency.meta.com/policies/ad-standards/)
- [Personal attributes ads policy](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/)
- [Health & Wellness ads policy](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/)
- [n8n documentation](https://docs.n8n.io/)

**Phiên bản API:** v26.0 phát hành 29/07/2026. Đừng dùng các tutorial còn `CONVERSIONS`/ `LINK_CLICKS` làm objective Campaign mới hay `smart_promotion_type=AUTOMATED_SHOPPING_ADS` của Advantage+ Shopping cũ. Chọn Graph API version rõ ràng, kiểm tra changelog khi chạy. Một số hành vi v26.0 áp dụng với mọi version từ **27/10/2026**, chẳng hạn Messenger Stories placement, poll ad creative, một số fields của delivery_estimate. Không viết hardcode các field bị deprecated.

## 2. Khả năng

| Đọc (không thay dữ liệu) | Ghi (cần chủ shop duyệt scope) |
|---|---|
| Ad account info, trạng thái, currency, timezone | Tạo campaign, ad set, creative, ad |
| Campaigns, adsets, ads, creatives | Tải ảnh/video lên tài khoản |
| Pages, Instagram account được cấp quyền, Pixel/dataset | Cập nhật tên, nội dung, targeting, ngân sách |
| Insights: spend, CPM, CTR, CPC, CPA/ROAS nếu dữ liệu có | PAUSE/ACTIVATE chiến dịch |
| Đọc cảnh báo và trạng thái xét duyệt | Thay lịch chạy, xóa/archived |

**Chạy quảng cáo** cần thanh toán hợp lệ ở Ads Manager, tài khoản không bị hạn chế và creative được phê duyệt; tạo object qua API không đảm bảo hiển thị quảng cáo.

## 3. Điều kiện truy cập

1. Tài khoản Meta Business Portfolio có ad account; Page/Instagram được ủy quyền.
2. Meta Developer App có sản phẩm **Marketing API**; cấp `ads_read` để đọc và `ads_management` để quản lý.
3. Với **tài khoản ad của chính business**: tài liệu Meta nêu Standard Access cùng các permission là đủ trong nhiều trường hợp.
4. Với **tài khoản ad của bên thứ ba**: thường cần Advanced Access cho `ads_read` / `ads_management`, App Review và có thể Business Verification.
5. Quyền `business_management` khi cần quản lý Business assets / một số pixel / phân quyền; Page/Instagram cần quyền bổ sung tương ứng. **Không mặc định yêu cầu mọi quyền.**
6. Đối với server: ưu tiên **System User token** được gán đúng ad account/Page/assets cần dùng, quyền ít nhất có thể; quản lý token qua secret store, định kỳ kiểm tra hạn sử dụng và xoay vòng.

**Kiểm tra quyền trước khi POST:** xác thực token, GET thông tin tài khoản, xác minh Page ID, IG actor ID, Pixel/dataset ID, conversion events, ad account `currency` & `timezone_name`, spending limit, trạng thái tài khoản.

**Tuyệt đối không gửi token thật qua chat hay chèn vào GitHub Actions YAML.**

## 4. Đối tượng dữ liệu và các endpoint chính

Base URL `https://graph.facebook.com/v26.0`

| Bước | HTTP / endpoint | Nội dung |
|---|---|---|
| A | `GET /me/adaccounts` | Tài khoản mà token có thể truy cập |
| B | `GET /act_{AD_ACCOUNT_ID}?fields=id,name,currency,timezone_name,account_status` | Kiểm tra ad account |
| C | `GET /act_{AD_ACCOUNT_ID}/campaigns` | Đọc chiến dịch hiện tại |
| D | `POST /act_{AD_ACCOUNT_ID}/campaigns` | Tạo campaign |
| E | `POST /act_{AD_ACCOUNT_ID}/adsets` | Tạo ad set, ngân sách, conversion, audience |
| F | `POST /act_{AD_ACCOUNT_ID}/adimages` hoặc `/advideos` | Tải tài nguyên creative; video cần chờ xử lý |
| G | `POST /act_{AD_ACCOUNT_ID}/adcreatives` | Gắn Page/Instagram identity, nội dung, link, ảnh/video |
| H | `POST /act_{AD_ACCOUNT_ID}/ads` | Gắn ad set và creative thành ad |
| I | `GET /act_{AD_ACCOUNT_ID}/insights` | Báo cáo account |
| J | `GET /{CAMPAIGN_ID}/insights` | Báo cáo campaign |
| K | `POST /{CAMPAIGN_ID}`, `POST /{ADSET_ID}`, `POST /{AD_ID}` | Cập nhật trạng thái hoặc cấu hình — quyền ghi |

**Lưu ý:** Mỗi request phải theo đúng phiên bản, endpoint, thuộc tính được hỗ trợ tại thời điểm thực thi. Một số tính năng bị giới hạn theo tài khoản, objective, placement, Page identity và sự kiện Pixel.

## 5. Gọi thử chỉ đọc (không phát sinh quảng cáo)

Sử dụng **Bearer token** qua Header, không chèn token vào URL:

```bash
# Đặt token trong môi trường kín của server, tránh shell history/log.
curl --fail-with-body -sS \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  "https://graph.facebook.com/v26.0/act_${META_AD_ACCOUNT_ID}?fields=id,name,currency,timezone_name,account_status"

curl --fail-with-body -sS \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  "https://graph.facebook.com/v26.0/act_${META_AD_ACCOUNT_ID}/campaigns?fields=id,name,objective,status,effective_status&limit=10"
```

**Chưa tạo gì:** chỉ khi hai lệnh GET hoạt động mới được chuẩn bị kế hoạch POST.

## 6. Thiết kế một Sales Campaign chuyển đổi website (Thái Lan)

### 6.1 Campaign

- `objective=OUTCOME_SALES`, `buying_type=AUCTION`
- `name` rõ ràng, ví dụ `DRAFT_TH_FASHION_SALES_2026-10`
- `special_ad_categories`: khai báo đúng trường hợp kinh doanh; không đặt NONE nếu thuộc danh mục đặc biệt.
- `status=PAUSED`.
- Quyết định đặt ngân sách **ở Campaign** (Advantage Campaign Budget) **hoặc Ad Set**; schema thay đổi tùy loại Campaign. Không điền mâu thuẫn.
- Advantage+ Sales mới dựa vào các điều khiển ngân sách, audience, placements; tránh mẫu API ASC cũ.

### 6.2 Ad set

- `campaign_id` trả về từ bước trên
- `destination_type=WEBSITE` nếu mục tiêu trang Webcake; `optimization_goal=OFFSITE_CONVERSIONS` khi đủ điều kiện
- `billing_event=IMPRESSIONS` (phụ thuộc mục tiêu/thiết lập được API chấp nhận)
- `promoted_object={"pixel_id":"PIXEL_ID","custom_event_type":"PURCHASE"}` nếu tối ưu Purchase; dùng `LEAD` nếu tối ưu lead hợp lệ.
- `targeting`: geo `TH` và điều kiện độ tuổi phù hợp chính sách; creative tiếng Thái, vị trí hợp lệ.
- `daily_budget` hoặc `lifetime_budget`; **đổi số tiền theo đơn vị nhỏ nhất của tiền tệ tài khoản**. Phải GET `currency` và kiểm tra offset trước khi tạo. Không mặc định mọi ad account dùng THB.
- `status=PAUSED`.

### 6.3 Creative

- `object_story_spec.page_id` trỏ Facebook Page đã được cấp quyền.
- Có thể cần Instagram actor khi chạy Instagram.
- `link_data` hoặc `video_data` với `message`, `link`, `call_to_action`, asset hash/video ID theo định dạng hợp lệ.
- Link trỏ **trang đích đã được kiểm tra**: Webcake landing page hoặc site khác.
- Chọn định dạng creative hợp Meta policy và kích thước chuẩn; không tạo claim gây hiểu lầm.

### 6.4 Ad

- `adset_id`, `creative: {"creative_id": "..."}`, `name`, `status=PAUSED`.
- GET lại để kiểm tra ID, cấu hình, trạng thái, link, creative, compliance và asset.
- Gửi ID & bản preview cho chủ tài khoản. Không activate khi chưa có xác nhận.

**Skeleton logic (không copy nguyên làm JSON API payload; cần build schema theo Ads account thực tế):**

```yaml
request_id: draft-th-001
stage: PREPARE_ONLY
campaign:
  objective: OUTCOME_SALES
  status: PAUSED
adset:
  destination_type: WEBSITE
  optimization_goal: OFFSITE_CONVERSIONS
  conversion_event: PURCHASE
  region: TH
  status: PAUSED
creative:
  language: th
  landing_page: verified_webcake_url
ad:
  status: PAUSED
approval:
  can_activate: false
  can_change_budget: false
```

## 7. Pixel + Conversions API (CAPI)

Nếu muốn **Sales / Purchase** thay vì chỉ đo clicks, cần bảo đảm:
- Landing Page Webcake có Meta Pixel (hoặc nguồn dữ liệu tương đương) được gắn đúng ID.
- Event `ViewContent`, `Lead`, `InitiateCheckout`, `Purchase` chỉ gửi khi sự kiện đúng thực tế. Ví dụ **không gửi Purchase khi mới mở trang**; xác định có đặt hàng thành công hay chỉ lead.
- Nếu dùng CAPI từ POS/n8n: chỉ chuyển dữ liệu người dùng khi có quyền và tuân thủ luật/quy định; dùng `event_id` đồng nhất khi Pixel và CAPI báo **cùng một** giao dịch để chống đếm trùng, kiểm tra trong Events Manager.
- Để tối ưu Purchase, cần event Purchase có dữ liệu đáng tin cậy. Nếu ít đơn thành công, cân nhắc tối ưu Lead khi đúng mục tiêu kinh doanh; **không thổi phồng event**.
- Phân biệt `Purchase` do Meta đo với đơn thực tế Pancake POS; kết nối data có map `order_id` và mã chiến dịch/UTM.

## 8. Kiến trúc cho Muse + WhatsApp + n8n + GitHub + Webcake + Meta

```text
Chủ doanh nghiệp (WhatsApp / Muse, nếu connector hỗ trợ)
   -> AI Orchestrator (chỉ phân tích và đề xuất)
   -> GitHub Issue (yêu cầu, thông số không chứa bí mật)
   -> n8n / Meta Ads Gateway (token được bảo vệ, allowlisted endpoints)
      -> Meta READ: adaccount, pages, pixels, campaigns, insights
      -> Webcake READ/WRITE: landing page nháp
      -> Meta WRITE: Campaign / AdSet / Creative / Ad -- toàn bộ PAUSED
   -> Kiểm tra cấu hình + Preview + chi phí dự kiến
   -> Approval Gate (chủ sở hữu duyệt action cụ thể + account + ngân sách)
      -> ACTIVE chỉ sau phê duyệt; xem lại trạng thái và audit
   -> Đọc insights định kỳ; báo cáo đề xuất; KHÔNG tự tăng budget
```

### Phân chia quyền

- **AI Brain**: sinh chiến lược, văn bản, cấu hình dạng JSON theo schema, không giữ token.
- **Validation Service**: kiểm tra ngân sách, currency, audience, Page ID, Pixel event, URLs, claims, tên sản phẩm, giá.
- **Execution Gateway**: giữ token, hạn chế các POST theo allowlist và danh sách ad accounts.
- **Approval Service**: lưu `action_id`, người duyệt, thời hạn, payload đã duyệt; chỉ chấp nhận action đúng trạng thái và không đổi payload sau duyệt.
- **GitHub**: lưu code và Issue/PR tóm tắt, không lưu token / khách hàng.
- **n8n**: webhook, polling, queue, retry/backoff, cảnh báo.
- **WhatsApp**: có thể làm kênh nhận và duyệt **nếu có Business API/connector hợp lệ**; không suy đoán Muse cá nhân cho phép bot bên ngoài gửi vào chat riêng.

### Kiểm soát ghi bắt buộc

1. Mặc định `READ_ONLY`; bật `PREPARE_DRAFT` riêng sau xác thực.
2. Khi `PREPARE_DRAFT`, chỉ cho phép **tạo mới PAUSED**, không sửa campaign đang chạy.
3. Chặn `status=ACTIVE` trong mã tạo draft; chặn budget ngoài ngưỡng.
4. Duyệt hai lớp cho mọi thao tác kích hoạt, tăng tiền, thay vị trí/đối tượng, thay conversion event, xóa hoặc sửa ads đang chạy.
5. Log request ID, response ID, thời gian, người duyệt, Meta trace/error code; **ẩn token/PII**.
6. Idempotency/dedup nội bộ để không tạo trùng camp nếu retry hoặc message webhook lặp.
7. Theo dõi errors `190` (token), `10/200` (permission), `100` (invalid parameter) và rate limit; không retry vô hạn.
8. Meta account spend cap + ngưỡng cảnh báo nội bộ; giới hạn tối đa theo ngày, yêu cầu duyệt khi vượt.
9. Chỉ người sở hữu tài khoản hoặc người được phân quyền rõ ràng được kích hoạt.

## 9. Policy quảng cáo — đặc biệt sản phẩm trà/thảo dược

- Meta cấm nội dung **khẳng định hoặc ám chỉ thuộc tính cá nhân nhạy cảm** của người xem, gồm tình trạng sức khỏe. Tránh câu như `Bạn bị bệnh thận?` hoặc `Bạn đang yếu sinh lý?` nhắm trực tiếp người đọc.
- Quảng cáo sức khỏe, mỹ phẩm, giảm cân và thực phẩm chức năng có các hạn chế riêng; một số nhóm cần giới hạn độ tuổi, không được gây kỳ vọng phi thực tế hoặc dùng ảnh biến đổi cơ thể mang tính giật gân.
- Không cam kết chữa bệnh, giảm cân chắc chắn, khỏi bệnh trong 5–7 ngày, hoặc lợi ích không có chứng cứ. Quảng cáo thuốc/thực phẩm và sản phẩm Thái Lan còn cần kiểm tra yêu cầu pháp lý địa phương.
- Không đưa customer list / số điện thoại thu thập được sang Meta nếu chưa có cơ sở và đồng ý sử dụng dữ liệu hợp lệ.

## 10. Checklist kiểm tra trước khi tích hợp

- [ ] Tài khoản quảng cáo thực sự sở hữu/quản lý; Page/Instagram access.
- [ ] Meta app + Marketing API product + đúng Standard/Advanced Access.
- [ ] Token đúng loại, còn hạn; đúng `ads_read`/`ads_management`, System User đã được gán assets.
- [ ] GET ad account và campaigns thành công.
- [ ] Đọc `currency`, timezone, trạng thái, spend cap.
- [ ] Kiểm tra pixel/dataset và conversion events nếu chạy Sales website.
- [ ] Webcake landing URL thật, form đúng, ảnh/video tồn tại và policy đạt.
- [ ] Tạo draft **chỉ khi** người dùng cho phép thao tác ghi.
- [ ] Dùng `PAUSED` cho toàn bộ object.
- [ ] GET xác nhận trạng thái; gửi preview, tổng ngân sách, Page, vùng, URL.
- [ ] Nhận phê duyệt độc lập rồi mới ACTIVE.
- [ ] Đọc Insights, so với Pancake POS và theo dõi spend/cost per result.
- [ ] Không thay đổi campaign đang chạy hoặc tăng ngân sách nếu chưa có lệnh.

## 11. Prompt gửi cho AI triển khai

> Đọc tài liệu Meta Marketing API này và các liên kết chính thức. Hãy xây một adapter Meta Ads v26.0 qua n8n hoặc API gateway để kết nối với AI Orchestrator, GitHub và Webcake. Bắt đầu bằng `READ_ONLY`, dùng access token ở secret manager, kiểm thử danh sách ad accounts, campaigns, pixels và insights. Tiếp theo xây chức năng `PREPARE_DRAFT` tạo Campaign > AdSet > Creative > Ad ở trạng thái PAUSED và kiểm tra kết quả, nhưng **không thực hiện POST trên tài khoản thật cho đến khi chủ tài khoản cho phép**. Đặt approval gate cho mọi lần bật quảng cáo hoặc thay ngân sách. Không tác động các camp đang chạy. Nếu v26.0 có field khác với ví dụ, ưu tiên schema/changelog Meta chính thức và báo chỗ cần chỉnh.

**Tình trạng triển khai:** Đây là tài liệu nghiên cứu, chưa kiểm tra token, chưa xác thực API trên ad account của chủ sở hữu và chưa tạo/chạy campaign.
