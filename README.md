# AdsPro Report (Prototype)

AdsPro Report là bản prototype dashboard theo dõi hiệu suất quảng cáo đa nền tảng theo thời gian thực.

## Tính năng có trong bản này

- Dashboard KPI tổng quan: doanh thu, chi phí quảng cáo, ROAS, CPA, CTR, CPM, số đơn, tỷ lệ hoàn, lợi nhuận thực.
- Bộ lọc nhanh theo **Hôm nay / Hôm qua / 7 ngày**.
- Biểu đồ hiệu suất theo **ngày / tuần / tháng**.
- Khu vực so sánh chiến dịch (Camp A vs Camp B).
- Mô phỏng cảnh báo thông minh (CPA, ROAS, tỷ lệ hoàn, CPM).
- Khu vực báo cáo tự động Telegram / Email (8h sáng, 23h, tuần, tháng).
- Phần định hướng bản Pro với AI gợi ý tối ưu ngân sách.

## Chạy local

Chỉ cần mở `index.html` trực tiếp hoặc chạy web server tĩnh:

```bash
python3 -m http.server 4173
```

Sau đó truy cập: `http://localhost:4173`.
