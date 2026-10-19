// Public browser-only simulation. No credentials, advertising writes or network requests.
(() => {
'use strict';
window.MARKETING_DEMO_LOCAL_MODE=true;
const key='marketing-ai-os-local-v03';
const baseTasks=[
 {id:'tsk_demo1',title:'Kiểm tra mẫu quảng cáo có CPA cao',assignee:'Media Buyer',status:'todo',priority:'high',createdAt:'2026-10-19T00:00:00Z'},
 {id:'tsk_demo2',title:'Viết 3 hook video tiếng Thái',assignee:'Creative',status:'doing',priority:'normal',createdAt:'2026-10-19T00:00:00Z'}
];
function loadDrafts(){
 try{
  const stored=JSON.parse(localStorage.getItem(key)||'null');
  if(stored&&Array.isArray(stored.tasks)&&Array.isArray(stored.creatives)&&Array.isArray(stored.landingPages))return stored;
 }catch{}
 return {tasks:baseTasks,creatives:[],landingPages:[]};
}
let drafts=loadDrafts();
const str=(x,n=200)=>String(x??'').trim().slice(0,n);
const ident=p=>p+'_'+Math.random().toString(36).slice(2,11);
const respond=(value,status=200)=>Promise.resolve(new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8'}}));
const error=(message,status=400)=>respond({error:message},status);
const save=()=>{try{localStorage.setItem(key,JSON.stringify(drafts));return true}catch{return false}};
const nativeFetch=window.fetch.bind(window);
function thaiVideoDraft({product,offer,tone='friendly',duration=30}){
  const p=String(product).trim();const o=String(offer||'').trim();const d=Math.max(15,Math.min(60,Number(duration)||30));
  const script=`กำลังมองหาสินค้าที่ใช่สำหรับคุณอยู่ไหมคะ? วันนี้เราขอแนะนำ ${p} ค่ะ ${o?`ตอนนี้มีโปรโมชันพิเศษ ${o} `:''}ดูรายละเอียดเพิ่มเติมได้เลยค่ะ`;
  return {language:'th',duration:d,style:tone,script,scenes:[
    {seconds:`0–${Math.round(d*.2)}`,purpose:'Hook',shot:'Cận cảnh sản phẩm với tiêu đề tiếng Thái'},
    {seconds:`${Math.round(d*.2)}–${Math.round(d*.55)}`,purpose:'Giới thiệu',shot:'Hình ảnh sản phẩm thực, lời thuyết minh'},
    {seconds:`${Math.round(d*.55)}–${Math.round(d*.8)}`,purpose:'Ưu đãi',shot:'Hiển thị giá/ưu đãi đúng thông tin đã cung cấp'},
    {seconds:`${Math.round(d*.8)}–${d}`,purpose:'CTA',shot:'Đi đến landing page để xem chi tiết'}
  ],status:'script-draft',videoUrl:null,notice:'Chỉ tạo kịch bản/storyboard. Chưa gọi AI video, TTS hoặc sinh file MP4; không phát sinh chi phí.'};
}


window.fetch=(input,init={})=>{
 const raw=typeof input==='string'?input:input?.url;
 if(typeof raw!=='string'||!raw.startsWith('/api/'))return nativeFetch(input,init);
 const pathname=new URL(raw,location.origin).pathname;
 const method=String(init.method||'GET').toUpperCase();
 if(method==='GET'){
  if(pathname==='/api/tasks')return respond({tasks:drafts.tasks});
  if(pathname==='/api/creatives')return respond({items:drafts.creatives});
  if(pathname==='/api/landing-pages')return respond({items:drafts.landingPages});
  return nativeFetch(input,init);
 }
 let body={};
 try{body=JSON.parse(init.body||'{}')}catch{return error('Dữ liệu không hợp lệ.')}
 if(method==='POST'&&pathname==='/api/tasks'){
   if(!str(body.title,180))return error('Nhập tên công việc.');
   if(drafts.tasks.length>=70)return error('Quá 70 công việc thử nghiệm.');
   const task={id:ident('tsk'),title:str(body.title,180),assignee:str(body.assignee,80)||'Chưa giao',status:'todo',priority:['low','normal','high'].includes(body.priority)?body.priority:'normal',createdAt:new Date().toISOString()};
   drafts.tasks.unshift(task);return save()?respond({task},201):error('Không thể lưu trên thiết bị.',507);
 }
 const task=pathname.match(/^\/api\/tasks\/([^/]+)$/);
 if(method==='PATCH'&&task){
   if(!['todo','doing','done'].includes(body.status))return error('Trạng thái không hợp lệ.');
   const found=drafts.tasks.find(t=>t.id===task[1]);if(!found)return error('Không tìm thấy công việc.',404);
   found.status=body.status;return save()?respond({task:found}):error('Không thể lưu trên thiết bị.',507);
 }
 if(method==='POST'&&pathname==='/api/creatives'){
   if(!str(body.product,150))return error('Nhập tên sản phẩm.');
   if(drafts.creatives.length>=70)return error('Đã đạt giới hạn 70 kịch bản demo.');
   const input={product:str(body.product,150),offer:str(body.offer,200),duration:body.duration,tone:str(body.tone,30)};
   const draft={id:ident('vid'),product:input.product,offer:input.offer,...thaiVideoDraft(input),createdAt:new Date().toISOString()};
   drafts.creatives.unshift(draft);return save()?respond({draft},201):error('Không thể lưu trên thiết bị.',507);
 }
 if(method==='POST'&&pathname==='/api/landing-pages'){
   if(!str(body.product,150)||!str(body.headline,180))return error('Nhập sản phẩm và tiêu đề.');
   if(drafts.landingPages.length>=70)return error('Đã đạt giới hạn 70 landing page demo.');
   const page={id:ident('page'),product:str(body.product,150),headline:str(body.headline,180),description:str(body.description,500),cta:str(body.cta,60)||'Tìm hiểu thêm',status:'draft',createdAt:new Date().toISOString()};
   drafts.landingPages.unshift(page);return save()?respond({page},201):error('Không thể lưu trên thiết bị.',507);
 }
 return error('Phiên bản demo không hỗ trợ thao tác này; quyền thay đổi quảng cáo bị khóa.',403);
};
})();
