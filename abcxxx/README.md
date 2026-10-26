# abcxxx — public connector relay

Neutral, auditable HTTPS relay for a task-coordination endpoint.

GET /docs — public browser setup guide.
GET /docs.md — public Markdown instructions for automated clients.
POST /mcp — remote stateless MCP JSON-RPC.
POST /v1/tool — authenticated fallback task calls.
GET /healthz — health check.

All task calls require per-worker Bearer credentials; this relay does not issue or store credentials. Each credential is forwarded via TLS to the existing task server. The relay does not connect to ad, sales, media or finance platforms and cannot change campaigns or move money.

Do not add credentials or customer data to this repository.

## Why a relay?

Some Custom Connector implementations reject domains with literal IP addresses embedded in the hostname. A conventional HTTPS hostname can proxy requests to the task server without modifying existing business applications.

## Notes

Free instances may cold-start and time out client connections. A relay adds an additional TLS termination point at the hosting provider; a dedicated DNS hostname pointing directly to the VPS is preferable for long-term use.

## Security

- Fixed upstream; no user-supplied destination or arbitrary URL.
- Fixed route allowlist; no internal admin or database access.
- No embedded secrets, no request/body logs, size limits, no redirects.
- The origin server enforces role permissions.
- Validate a client handshake and permissions before production use.
