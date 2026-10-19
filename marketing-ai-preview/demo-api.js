// Public demo API shim. Entirely synthetic, read-only, no external network calls.
(() => {
"use strict";
const campaigns = [
{id:"cmp_001",name:"Trà thảo mộc | Bangkok",platform:"meta",market:"TH",status:"active",spend:17200,revenue:42800,orders:118,impressions:129000,clicks:3100},
{id:"cmp_002",name:"Quần nữ | Chiang Mai",platform:"meta",market:"TH",status:"active",spend:8900,revenue:16100,orders:49,impressions:74000,clicks:1630},
{id:"cmp_003",name:"UGC Thai | 9:16",platform:"tiktok",market:"TH",status:"paused",spend:6600,revenue:12800,orders:37,impressions:61000,clicks:1850},
{id:"cmp_004",name:"Search | Herbal Tea",platform:"google",market:"TH",status:"active",spend:5400,revenue:15300,orders:41,impressions:42000,clicks:990}
];
const summary=campaigns.reduce((a,c)=>({spend:a.spend+c.spend,revenue:a.revenue+c.revenue,orders:a.orders+c.orders,impressions:a.impressions+c.impressions,clicks:a.clicks+c.clicks}),{spend:0,revenue:0,orders:0,impressions:0,clicks:0});
summary.roas=summary.revenue/summary.spend;
summary.cpa=summary.spend/summary.orders;
summary.ctr=100*summary.clicks/summary.impressions;
const providers=[
{id:"meta",name:"Meta Marketing API",status:"not_connected",scope:"reporting-first",notes:"Cần Meta App, OAuth, ads_read và xét quyền phù hợp."},
{id:"google",name:"Google Ads API",status:"not_connected",scope:"reporting-first",notes:"Cần Google Cloud OAuth và quyền API hợp lệ."},
{id:"tiktok",name:"TikTok Marketing API",status:"not_connected",scope:"reporting-first",notes:"Cần TikTok Business App, OAuth và quyền advertiser."}
];
const findings=campaigns.map(c=>{
const roas=c.revenue/c.spend;const cpa=c.spend/c.orders;
return {campaignId:c.id,name:c.name,platform:c.platform,roas:+roas.toFixed(2),cpa:+cpa.toFixed(2),severity:roas<1.8?"attention":roas>=2.4?"positive":"neutral",suggestion:roas<1.8?"Rà soát creative, tracking và biên lợi nhuận; chưa tự tắt quảng cáo.":roas>=2.4?"Đánh giá chất lượng đơn đã giao trước khi đề xuất tăng ngân sách.":"Tiếp tục theo dõi đủ dữ liệu trước khi thay đổi."};
}).sort((a,b)=>a.roas-b.roas);
const tasks=[
{id:"tsk_demo1",title:"Kiểm tra mẫu quảng cáo có CPA cao",assignee:"Media Buyer",status:"todo",priority:"high",createdAt:"2026-10-19T00:00:00.000Z"},
{id:"tsk_demo2",title:"Viết 3 hook video tiếng Thái",assignee:"Creative",status:"doing",priority:"normal",createdAt:"2026-10-19T00:00:00.000Z"}
];
const data={
"/api/me":{authenticated:true,demo:true,user:{id:"demo",email:"preview@demo.invalid",role:"viewer"},csrf:"demo",version:"0.1.0",liveActionsEnabled:false},
"/api/overview":{mode:"sample",currency:"THB",summary,platforms:providers,campaignCount:campaigns.length,pendingApprovals:0},
"/api/campaigns":{mode:"sample",campaigns},
"/api/connections":{providers,sync:{enabled:false,readOnly:true,frequency:"disabled",providers:["meta","google","tiktok"],message:"Preview tĩnh; không có OAuth hoặc API."}},
"/api/insights":{summary,findings,generatedBy:"local-rule-engine",disclaimer:"Phân tích quy tắc trên dữ liệu DEMO; không phải AI model và không phải dữ liệu quảng cáo thật."},
"/api/tasks":{tasks},
"/api/creatives":{items:[]},
"/api/landing-pages":{items:[]},
"/api/approvals":{items:[],executionEnabled:false},
"/api/users":{users:[]}
};
// Deterministic SAMPLE analytics. No external API calls or real advertiser data.
const REPORT_DAYS = Object.freeze([7, 14, 30]);
const REPORT_PLATFORMS = Object.freeze(['all', 'meta', 'google', 'tiktok']);
const fields = ['spend','revenue','orders','impressions','clicks'];
const numbers = rows => {
  const sum = Object.fromEntries(fields.map(k => [k,rows.reduce((a,r) => a+Number(r[k]||0),0)]));
  return {...sum,
    roas:sum.spend ? sum.revenue/sum.spend : 0,
    cpa:sum.orders ? sum.spend/sum.orders : 0,
    cpc:sum.clicks ? sum.spend/sum.clicks : 0,
    cpm:sum.impressions ? sum.spend*1000/sum.impressions : 0,
    ctr:sum.impressions ? sum.clicks*100/sum.impressions : 0
  };
};
// Assign full 30-day totals without losing a single unit to rounding.
function allocate(total,seed,count=30){
  const weights=Array.from({length:count},(_,i)=>100+((i*13+seed*17)%47)+(i%7===0?18:0));
  const denom=weights.reduce((a,b)=>a+b,0);
  const amounts=weights.map(x=>Math.floor(Math.max(0,Number(total)||0)*x/denom));
  const remainder=Math.max(0,Math.round(Number(total)||0))-amounts.reduce((a,b)=>a+b,0);
  for(let i=0;i<remainder;i++)amounts[(i+seed)%count]++;
  return amounts;
}
function buildDemoReport(campaigns,{days=7,platform='all',endDate=new Date()}={}){
  if(!REPORT_DAYS.includes(Number(days)))throw Object.assign(new Error('Khoảng ngày không hợp lệ (7, 14 hoặc 30).'),{status:400});
  if(!REPORT_PLATFORMS.includes(platform))throw Object.assign(new Error('Nền tảng không hợp lệ.'),{status:400});
  const end=new Date(endDate);
  if(!Number.isFinite(end.getTime()))throw Object.assign(new Error('Ngày kết thúc không hợp lệ.'),{status:400});
  const count=Number(days);
  const selected=campaigns.filter(c=>platform==='all'||c.platform===platform);
  const slices=[];
  for(const [idx,c] of selected.entries()){
    const distributions=Object.fromEntries(fields.map((field,n)=>[field,allocate(c[field],idx*11+n+1)]));
    for(let i=30-count;i<30;i++){
      const date=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),end.getUTCDate()-(29-i))).toISOString().slice(0,10);
      slices.push({date,campaignId:c.id,name:c.name,platform:c.platform,market:c.market,
        ...Object.fromEntries(fields.map(field=>[field,distributions[field][i]]))});
    }
  }
  const daily=Array.from({length:count},(_,i)=>{
    const date=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),end.getUTCDate()-(count-1-i))).toISOString().slice(0,10);
    return {date,...numbers(slices.filter(r=>r.date===date))};
  });
  const perCampaign=selected.map(c=>({...c,...numbers(slices.filter(r=>r.campaignId===c.id))}));
  const summary=numbers(slices);
  return {mode:'sample',isLive:false,currency:'THB',filters:{days:count,platform},summary,daily,campaigns:perCampaign,
    disclaimer:'100% dữ liệu DEMO tự sinh, không liên quan tài khoản quảng cáo thật. Không dùng ra quyết định chi tiêu.'};
}
const csvCell = value => {
  let s=String(value??'');
  // Protect CSV when imported into Excel/Sheets.
  if(/^[\s]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
};
function reportCsv(report){
  const rows=[['Date','Platform filter','Spend (THB)','Revenue (THB)','Orders','Impressions','Clicks','ROAS','CPA (THB)','CPM (THB)','CTR (%)']];
  for(const r of report.daily)rows.push([r.date,report.filters.platform,r.spend,r.revenue,r.orders,r.impressions,r.clicks,r.roas.toFixed(3),r.cpa.toFixed(2),r.cpm.toFixed(2),r.ctr.toFixed(2)]);
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

const nativeFetch=window.fetch.bind(window);
window.fetch = (input,init={}) => {
 const url=typeof input==="string"?input:input?.url;
 if(typeof url==="string"&&url.startsWith("/api/")){
 const method=(init.method||"GET").toUpperCase();
 if(method!=="GET")return Promise.resolve(new Response(JSON.stringify({error:"Bản demo tĩnh chỉ xem, không lưu dữ liệu hay chạy quảng cáo."}),{status:403,headers:{"Content-Type":"application/json"}}));
 const query=new URL(url,location.origin);
 const path=query.pathname;
 let value=data[path];
 try{
  if(path==="/api/report"||path==="/api/report.csv"||path==="/api/insights"){
   const days=query.searchParams.has("days")?Number(query.searchParams.get("days")):7;
   const platform=query.searchParams.get("platform")||"all";
   const report=buildDemoReport(campaigns,{days,platform});
   if(path==="/api/report.csv"){
     return Promise.resolve(new Response(reportCsv(report),{status:200,headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=marketing-ai-DEMO-report.csv"}}));
   }
   if(path==="/api/report")value=report;
   else value={summary:report.summary,findings:report.campaigns.map(c=>{
     const roas=c.spend?c.revenue/c.spend:0;
     return {campaignId:c.id,name:c.name,platform:c.platform,roas:+roas.toFixed(2),cpa:c.orders?+(c.spend/c.orders).toFixed(2):null,severity:roas<1.8?"attention":roas>=2.4?"positive":"neutral",suggestion:roas<1.8?"Rà soát creative, tracking và lợi nhuận.":roas>=2.4?"Xác minh chất lượng đơn đã giao trước khi đề xuất tăng ngân sách.":"Theo dõi thêm dữ liệu, chưa thay đổi quảng cáo."};
    }).sort((a,b)=>a.roas-b.roas),generatedBy:"local-rule-engine",disclaimer:"100% dữ liệu DEMO theo bộ lọc; không sử dụng để điều chỉnh quảng cáo thật."};
  }
 }catch(e){return Promise.resolve(new Response(JSON.stringify({error:e.message}),{status:400,headers:{"Content-Type":"application/json"}}));}
 return Promise.resolve(new Response(JSON.stringify(value===undefined?{error:"Endpoint chưa có trong demo."}:value),{status:value===undefined?404:200,headers:{"Content-Type":"application/json"}}));
 }
 return nativeFetch(input,init);
};
})();