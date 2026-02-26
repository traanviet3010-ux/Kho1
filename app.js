const reportData = {
  today: {
    "Doanh thu": 11850000,
    "Chi phí quảng cáo": 4200000,
    ROAS: 2.82,
    CPA: 58100,
    CTR: 2.3,
    CPM: 72400,
    "Số đơn": 72,
    "Tỷ lệ hoàn": 6.5,
    "Lợi nhuận thực": 3820000,
  },
  yesterday: {
    "Doanh thu": 9650000,
    "Chi phí quảng cáo": 3970000,
    ROAS: 2.43,
    CPA: 62200,
    CTR: 2.0,
    CPM: 69800,
    "Số đơn": 64,
    "Tỷ lệ hoàn": 8.2,
    "Lợi nhuận thực": 2550000,
  },
  "7days": {
    "Doanh thu": 71500000,
    "Chi phí quảng cáo": 26500000,
    ROAS: 2.7,
    CPA: 59700,
    CTR: 2.2,
    CPM: 71100,
    "Số đơn": 448,
    "Tỷ lệ hoàn": 7.4,
    "Lợi nhuận thực": 21150000,
  },
};

const campaignMetrics = [
  ["ROAS", "2.91", "2.37"],
  ["CPA", "56,400đ", "64,900đ"],
  ["CTR", "2.7%", "1.9%"],
  ["CPM", "69,300đ", "75,100đ"],
  ["Lợi nhuận", "+4,350,000đ", "+2,120,000đ"],
];

const chartData = {
  day: [1.2, 1.5, 1.4, 1.8, 2.0, 2.3, 2.1],
  week: [8.7, 10.4, 11.6, 12.2, 13.5, 12.9, 14.1],
  month: [42, 45, 49, 53, 58, 61, 68],
};

const alerts = [
  { type: "bad", text: "CPA tăng 18% so với trung bình 3 ngày gần nhất." },
  { type: "bad", text: "ROAS giảm mạnh ở Camp B (dưới ngưỡng 2.5)." },
  { type: "good", text: "Camp A có thể scale thêm 15% ngân sách." },
  { type: "bad", text: "Tỷ lệ hoàn 11.2% vượt ngưỡng an toàn 10%." },
];

const kpiGrid = document.getElementById("kpiGrid");
const tabButtons = document.querySelectorAll(".tab");
const periodButtons = document.querySelectorAll(".period");
const compareBody = document.getElementById("campaignCompare");
const alertsList = document.getElementById("alerts");
const canvas = document.getElementById("performanceChart");
const ctx = canvas.getContext("2d");

function formatValue(key, value) {
  if (["Doanh thu", "Chi phí quảng cáo", "Lợi nhuận thực"].includes(key)) {
    return `${value.toLocaleString("vi-VN")}đ`;
  }
  if (["CPA", "CPM"].includes(key)) {
    return `${value.toLocaleString("vi-VN")}đ`;
  }
  if (["CTR", "Tỷ lệ hoàn"].includes(key)) {
    return `${value}%`;
  }
  if (key === "ROAS") {
    return `${value}x`;
  }
  return value.toLocaleString("vi-VN");
}

function renderKpis(range) {
  kpiGrid.innerHTML = "";
  const data = reportData[range];
  Object.entries(data).forEach(([label, value]) => {
    const item = document.createElement("article");
    item.className = "kpi-item";
    item.innerHTML = `<div class="label">${label}</div><div class="value">${formatValue(
      label,
      value
    )}</div>`;
    kpiGrid.appendChild(item);
  });

  document.getElementById("profitPerOrder").textContent = "53,000đ";
  document.getElementById("profitPerCampaign").textContent = "4,350,000đ";
  document.getElementById("dailyNetProfit").textContent = formatValue(
    "Lợi nhuận thực",
    data["Lợi nhuận thực"]
  );
}

function renderCompare() {
  compareBody.innerHTML = campaignMetrics
    .map(
      ([metric, a, b]) =>
        `<tr><td>${metric}</td><td><strong>${a}</strong></td><td><strong>${b}</strong></td></tr>`
    )
    .join("");
}

function renderAlerts() {
  alertsList.innerHTML = alerts
    .map((a) => `<li class="${a.type}">${a.text}</li>`)
    .join("");
}

function drawLine(period = "day") {
  const values = chartData[period];
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#5a8cff";
  ctx.beginPath();

  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * (width - 40) + 20;
    const y = height - ((v - min) / range) * (height - 30) - 15;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    renderKpis(button.dataset.range);
  });
});

periodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    periodButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    drawLine(button.dataset.period);
  });
});

renderKpis("today");
renderCompare();
renderAlerts();
drawLine("day");
