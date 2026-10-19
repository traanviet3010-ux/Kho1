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
const nativeFetch=window.fetch.bind(window);
window.fetch = (input,init={}) => {
 const url=typeof input==="string"?input:input?.url;
 if(typeof url==="string"&&url.startsWith("/api/")){
 const method=(init.method||"GET").toUpperCase();
 if(method!=="GET")return Promise.resolve(new Response(JSON.stringify({error:"Bản demo tĩnh chỉ xem, không lưu dữ liệu hay chạy quảng cáo."}),{status:403,headers:{"Content-Type":"application/json"}}));
 const value=data[url.split("?")[0]];
 return Promise.resolve(new Response(JSON.stringify(value===undefined?{error:"Endpoint chưa có trong demo."}:value),{status:value===undefined?404:200,headers:{"Content-Type":"application/json"}}));
 }
 return nativeFetch(input,init);
};
})();