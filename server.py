"""Shopee Landing Studio: one-file backend, no official Shopee API.
Start with: python server.py
"""
import base64, hmac, io, json, os, re, zipfile
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

HERE = Path(__file__).parent
DOMAINS = ("shopee.vn", "shopee.co.th", "shopee.sg", "shopee.ph", "shopee.com.my", "shopee.co.id", "shopee.tw", "shopee.com.br", "shopee.com", "shope.ee")
def allowed(url):
    try:
        u = urlparse(url)
        h = (u.hostname or "").lower().rstrip(".")
        return u.scheme == "https" and bool(h) and not u.username and not u.password and u.port in (None,443) and any(h == d or h.endswith("." + d) for d in DOMAINS)
    except Exception: return False
def image_url(v):
    if not isinstance(v, str) or len(v)>2500: return ""
    try:
        u=urlparse(v.strip())
        return v.strip() if u.scheme=="https" and u.hostname and not u.username and not u.password and u.port in (None,443) else ""
    except Exception: return ""
def clean(s,n=1200): return re.sub(r"\s+"," ",str(s or "")).strip()[:n]
def product(data):
    images = data.get("images", [])
    if isinstance(images,str): images=images.splitlines()
    if not isinstance(images,list): images=[]
    images = list(dict.fromkeys(filter(None,[image_url(data.get("hero",""))]+[image_url(x) for x in images])))[:8]
    url=clean(data.get("source_url",""),2000)
    if not allowed(url): url=""
    benefit=data.get("benefits", [])
    if isinstance(benefit,str): benefit=benefit.splitlines()
    if not isinstance(benefit,list): benefit=[]
    return dict(title=clean(data.get("title"),180) or "Sản phẩm nổi bật",
                subtitle=clean(data.get("subtitle"),180) or "Lựa chọn phù hợp cho bạn",
                description=clean(data.get("description"),2800),
                price=clean(data.get("price"),35), old_price=clean(data.get("old_price"),35),
                currency=clean(data.get("currency"),8) or "VNĐ",
                images=images, source_url=url, benefits=[clean(x,180) for x in benefit if clean(x)][:6],
                shop=clean(data.get("shop"),80) or "Cửa hàng trực tuyến",
                cta=clean(data.get("cta"),55) or "Xem sản phẩm trên Shopee",
                accent=clean(data.get("accent"),12) if data.get("accent") in ("orange","green","blue","purple") else "orange")
def extract(url):
    if not allowed(url): raise ValueError("Chỉ hỗ trợ đường dẫn HTTPS Shopee hợp lệ.")
    sess=requests.Session()
    sess.headers.update({"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36","Accept":"text/html,application/xhtml+xml"})
    current=url
    for _ in range(6):
        if not allowed(current): raise ValueError("Shopee chuyển hướng ra ngoài miền cho phép.")
        r=sess.get(current,timeout=(4,12),allow_redirects=False,stream=True)
        if r.status_code in (301,302,303,307,308):
            nxt=r.headers.get("Location"); r.close()
            if not nxt: raise ValueError("Chuyển hướng không hợp lệ.")
            current=urljoin(current,nxt)
            continue
        if r.status_code in (403,429):
            r.close(); raise ValueError("Shopee đang chặn truy cập tự động. Hãy nhập dữ liệu thủ công.")
        r.raise_for_status()
        if "html" not in r.headers.get("content-type","").lower():
            r.close(); raise ValueError("Link này không trả về HTML.")
        data=bytearray()
        for part in r.iter_content(65536):
            data.extend(part)
            if len(data)>2000000: r.close(); raise ValueError("Trang quá lớn.")
        html=data.decode(r.encoding or "utf-8","replace");r.close()
        soup=BeautifulSoup(html,"html.parser")
        result=dict(source_url=current,title="",price="",description="",images=[],shop="",currency="฿" if ".co.th" in current else "VNĐ")
        for t in soup.find_all("script",attrs={"type":re.compile("ld\+json",re.I)}):
            try: objs=json.loads(t.string or t.get_text() or "")
            except (ValueError,TypeError):continue
            queue=objs if isinstance(objs,list) else [objs]
            while queue:
                o=queue.pop()
                if not isinstance(o,dict):continue
                graph=o.get("@graph",[])
                if isinstance(graph,list):queue.extend(graph)
                typ=o.get("@type",[])
                if (typ=="Product" or (isinstance(typ,list) and "Product" in typ)):
                    result["title"]=clean(o.get("name"),180)
                    result["description"]=clean(o.get("description"),1600)
                    pics=o.get("image",[])
                    if isinstance(pics,str): pics=[pics]
                    for v in (pics if isinstance(pics,list) else []):
                        if isinstance(v,str) and image_url(v):result["images"].append(v)
                    offer=o.get("offers",{})
                    if isinstance(offer,list):offer=offer[0] if offer else {}
                    if isinstance(offer,dict):
                        result["price"]=clean(offer.get("price"),35)
                        curr=clean(offer.get("priceCurrency"),8)
                        if curr:result["currency"]={"THB":"฿","VND":"VNĐ"}.get(curr,curr)
        def meta(key,attribute="property"):
            t=soup.find("meta",attrs={attribute:key})
            return clean(t.get("content"),2000) if t else ""
        result["title"]=result["title"] or meta("og:title")
        result["description"]=result["description"] or meta("og:description") or meta("description","name")
        img=meta("og:image")
        if image_url(img):result["images"].insert(0,img)
        result["images"]=list(dict.fromkeys(result["images"]))[:8]
        if not result["title"] and not result["images"]:raise ValueError("Không thấy dữ liệu công khai. Hãy tự nhập sản phẩm.")
        return result
    raise ValueError("Link chuyển hướng quá nhiều lần.")
def landing(data):
    p=product(data); e=lambda v:escape(str(v),quote=True)
    accent={"orange":"#eb623b","green":"#16815d","blue":"#2669d7","purple":"#6645cf"}[p["accent"]]
    hero=p["images"][0] if p["images"] else ""
    images="".join('<img src="'+e(u)+'" alt="Hình sản phẩm" loading="lazy">' for u in p["images"][1:]) or ""
    benefits="".join("<li>"+e(b)+"</li>" for b in p["benefits"]) or "<li>Thông tin chi tiết đang cập nhật</li>"
    cta='<a class="cta" href="'+e(p["source_url"])+'" target="_blank" rel="noopener noreferrer sponsored">'+e(p["cta"])+' →</a>' if p["source_url"] else '<p class="note">Chưa có link sản phẩm Shopee.</p>'
    hero_html='<img class="hero-img" src="'+e(hero)+'" alt="'+e(p["title"])+'">' if hero else '<div class="placeholder">Ảnh sản phẩm</div>'
    price=e(p["price"]+" "+p["currency"]) if p["price"] else "Liên hệ để biết giá"
    old='<s>'+e(p["old_price"]+" "+p["currency"])+'</s>' if p["old_price"] else ""
    desc='<p>'+e(p["description"])+'</p>' if p["description"] else '<p>Nội dung đang cập nhật.</p>'
    return '''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'''+e(p["description"][:160])+'''"><title>'''+e(p["title"])+'''</title><style>
*{box-sizing:border-box}body{margin:0;background:#faf9f7;color:#21212a;font-family:system-ui,-apple-system,sans-serif;line-height:1.6}header{background:white;padding:18px max(20px,calc((100vw - 1100px)/2));font-weight:850;border-bottom:1px solid #eaeaea}.wrap{max-width:1100px;padding:25px 16px;margin:auto}.hero{display:grid;grid-template-columns:1fr 1fr;gap:42px;align-items:center;padding:20px 0 48px}.media{background:#fff;border-radius:22px;padding:16px;box-shadow:0 12px 40px #11111112}.hero-img{width:100%;max-height:520px;object-fit:contain;border-radius:12px}.placeholder{height:400px;display:grid;place-items:center;color:#909090;background:#f0f0f0;border-radius:18px}.mini{display:flex;gap:8px;margin-top:12px;overflow:auto}.mini img{height:80px;width:80px;object-fit:cover;border-radius:9px}.eyebrow{font-weight:700;color:ACCENT}.hero h1{font-size:clamp(30px,4vw,53px);line-height:1.15;letter-spacing:-1.2px;margin:12px 0 18px}.sub{color:#6a6a73;font-size:17px}.price{font-size:30px;font-weight:900;color:ACCENT;margin:25px 0}.price s{color:#8b8c95;font-size:16px;margin-left:12px}.cta{display:inline-block;background:ACCENT;color:white;text-decoration:none;border-radius:12px;padding:16px 23px;font-weight:800}.box{background:white;border-radius:20px;padding:28px;margin:20px 0;border:1px solid #eeeeee}h2{font-size:25px;letter-spacing:-.5px}li{margin:8px 0}.note{color:#737373}footer{text-align:center;padding:35px 15px;color:#777;font-size:12px}@media(max-width:700px){.hero{grid-template-columns:1fr;gap:18px}.hero h1{font-size:32px}.box{padding:20px}.wrap{padding:16px}.media{padding:10px}.hero{padding:0 0 18px}}
</style></head><body><header>'''+e(p["shop"])+'''</header><main class="wrap"><section class="hero"><div class="media">'''+hero_html+'<div class="mini">'+images+'</div></div><div><div class="eyebrow">SẢN PHẨM NỔI BẬT</div><h1>'+e(p["title"])+'</h1><p class="sub">'+e(p["subtitle"])+'</p><div class="price">'+price+old+'</div>'+cta+'</div></section><div class="box"><h2>Điểm nổi bật</h2><ul>'+benefits+'</ul></div><div class="box"><h2>Mô tả sản phẩm</h2>'+desc+'</div><div class="box"><h2>Khám phá sản phẩm</h2><p>Xem giá, phí giao hàng và tùy chọn chính xác trên Shopee.</p>'+cta+'</div></main><footer>Thông tin sản phẩm do người tạo trang kiểm tra và chịu trách nhiệm.</footer></body></html>'''.replace("ACCENT",accent)

def handoff(p):
    return "WEBCAKE MCP HANDOFF\n\nHãy dùng Webcake Landing MCP để tạo landing page có thể chỉnh sửa từ dữ liệu sau. Chỉ dùng thông tin có sẵn, không bịa chứng nhận, đánh giá hay hiệu quả. Xác nhận trước khi xuất bản.\n\n"+json.dumps(p,ensure_ascii=False,indent=2)+"\n\nLưu ý: HTML/ZIP KHÔNG phải định dạng .pke để tải mẫu lên Webcake.\n"
class Handler(BaseHTTPRequestHandler):
    def auth(self):
        if urlparse(self.path).path=="/health":return True
        pw=os.getenv("TOOL_PASSWORD","")
        if not pw:return True
        user=secret=""
        try:
            h=self.headers.get("Authorization","")
            if h.startswith("Basic "):user,secret=base64.b64decode(h[6:],validate=True).decode().split(":",1)
        except Exception:pass
        if hmac.compare_digest(user,os.getenv("TOOL_USER","admin")) and hmac.compare_digest(secret,pw):return True
        self.send_response(401);self.send_header("WWW-Authenticate",'Basic realm="Shopee Landing Studio"');self.send_header("Cache-Control","no-store");self.end_headers();return False
    def output(self,code,body,typ="text/html; charset=utf-8",filename=None):
        if isinstance(body,str):body=body.encode()
        self.send_response(code);self.send_header("Content-Type",typ);self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.send_header("X-Content-Type-Options","nosniff")
        if filename:self.send_header("Content-Disposition",'attachment; filename="'+filename+'"')
        self.end_headers()
        try:self.wfile.write(body)
        except BrokenPipeError:pass
    def api(self,code,obj):self.output(code,json.dumps(obj,ensure_ascii=False),"application/json; charset=utf-8")
    def do_GET(self):
        if not self.auth():return
        path=urlparse(self.path).path
        if path=="/health":self.api(200,{"ok":True,"service":"shopee-landing-studio"})
        elif path=="/":self.output(200,(HERE/"web"/"index.html").read_bytes())
        else:self.api(404,{"error":"Không tìm thấy"})
    def do_POST(self):
        if not self.auth():return
        path=urlparse(self.path).path
        if path not in ("/api/extract","/api/preview","/api/export/html","/api/export/zip"):return self.api(404,{"error":"Không tìm thấy"})
        try:
            n=int(self.headers.get("Content-Length","0"))
            if n<1 or n>256000:return self.api(413,{"error":"Dữ liệu không hợp lệ"})
            data=json.loads(self.rfile.read(n))
            if not isinstance(data,dict):return self.api(400,{"error":"JSON object required"})
            if path=="/api/extract":
                try:self.api(200,{"ok":True,"product":extract(clean(data.get("url"),2000))})
                except (ValueError,requests.RequestException) as exc:self.api(422,{"ok":False,"message":str(exc)[:350]})
            elif path=="/api/preview":self.output(200,landing(data))
            elif path=="/api/export/html":self.output(200,landing(data),filename="landing-page.html")
            elif path=="/api/export/zip":
                p=product(data);b=io.BytesIO()
                with zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED) as z:
                    z.writestr("index.html",landing(p));z.writestr("product.json",json.dumps(p,ensure_ascii=False,indent=2));z.writestr("webcake-mcp-prompt.txt",handoff(p))
                self.output(200,b.getvalue(),"application/zip",filename="shopee-landing-kit.zip")
        except Exception:self.api(400,{"error":"Không thể xử lý yêu cầu"})
def main():
    port=int(os.getenv("PORT","8088"))
    ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()
if __name__=="__main__":main()
