#!/usr/bin/env python3
"""abcxxx public HTTPS relay: forwarding to privately managed task-only MCP.

No tokens in this repository or process environment. Never log bearer headers,
body content, or third-party data. Prefer a custom domain directly on the origin
to avoid a second TLS termination point for long-term use.
"""
from __future__ import annotations
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UPSTREAM = "https://mcp.103-77-209-147.sslip.io"
PORT = int(os.environ.get("PORT", "10000"))
MAX_BODY = 131072
ALLOWED = frozenset(("/", "/healthz", "/docs", "/docs/", "/docs.md",
                     "/docs/guide.md", "/mcp", "/v1/tool"))
REQUEST_HEADERS = (
    "Authorization", "Content-Type", "Accept", "MCP-Protocol-Version",
    "MCP-Session-Id", "Last-Event-ID"
)
RESPONSE_HEADERS = (
    "Content-Type", "MCP-Session-Id", "MCP-Protocol-Version",
    "Retry-After", "WWW-Authenticate"
)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

OPENER = urllib.request.build_opener(NoRedirect())

class Relay(BaseHTTPRequestHandler):
    server_version = "abcxxx/1.0"

    def log_message(self, fmt, *args):
        # No request URLs, headers, query strings, tokens or user data in logs.
        return

    def _reply(self, code: int, body: bytes, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body: self.wfile.write(body)

    def _handle(self, method: str):
        path = self.path
        if "?" in path or "#" in path or path not in ALLOWED:
            return self._reply(404, b'{"error":"Not found"}')
        if method == "POST" and path not in ("/mcp", "/v1/tool"):
            return self._reply(405, b'{"error":"Method not allowed"}')
        if method == "GET" and path in ("/mcp", "/v1/tool"):
            return self._reply(405, b'{"error":"Method not allowed"}')
        if path == "/":
            return self._reply(200, b'{"name":"abcxxx","docs":"/docs","mcp":"/mcp"}')
        body = None
        if method == "POST":
            size = self.headers.get("Content-Length")
            try: length = int(size)
            except (TypeError, ValueError): return self._reply(411, b'{"error":"Content-Length required"}')
            if length < 1 or length > MAX_BODY:
                return self._reply(413, b'{"error":"Invalid request size"}')
            body = self.rfile.read(length)
            if len(body) != length: return self._reply(400, b'{"error":"Incomplete request"}')
            if not self.headers.get("Authorization", "").startswith("Bearer "):
                return self._reply(401, b'{"error":"Unauthorized"}')
        headers = {k:self.headers[k] for k in REQUEST_HEADERS if self.headers.get(k)}
        headers["Accept-Encoding"] = "identity"
        req=urllib.request.Request(UPSTREAM + path, data=body, headers=headers, method=method)
        try:
            response = OPENER.open(req, timeout=28)
        except urllib.error.HTTPError as e:
            response = e
        except (urllib.error.URLError, TimeoutError, OSError):
            return self._reply(502, b'{"error":"Upstream unavailable"}')
        try:
            data = response.read(1048577)
            if len(data)>1048576:
                return self._reply(502, b'{"error":"Upstream response exceeds limit"}')
            self.send_response(response.status)
            for k in RESPONSE_HEADERS:
                val=response.headers.get(k)
                if val:self.send_header(k,val)
            self.send_header("Cache-Control","no-store")
            self.send_header("X-Content-Type-Options","nosniff")
            self.send_header("Content-Length",str(len(data)))
            self.end_headers()
            if data:self.wfile.write(data)
        finally:
            response.close()
    def do_GET(self):self._handle("GET")
    def do_POST(self):self._handle("POST")
    def do_HEAD(self):
        if self.path != "/healthz":
            self.send_response(405);self.send_header("Content-Length","0");self.end_headers();return
        self.send_response(200);self.send_header("Content-Length","0");self.end_headers()

if __name__=="__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT),Relay).serve_forever()
