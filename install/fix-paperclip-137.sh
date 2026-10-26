#!/usr/bin/env bash
# Recover Paperclip after build OOM (137). Uses upstream prebuilt stable image.
set -Eeuo pipefail
trap 'printf "[repair-paperclip] Failed at line %s. No other service was removed.\n" "$LINENO" >&2' ERR
umask 077
BASE=/opt/ai-business-os
PC="$BASE/paperclip"
ENV="$PC/docker/.env"
test -d "$PC" && test -f "$ENV" || { echo "Original Paperclip installation not found at $PC" >&2; exit 1; }
command -v docker >/dev/null && docker compose version >/dev/null || { echo "Docker Compose required" >&2; exit 1; }
test -r "$PC/docker/docker-compose.quickstart.yml" || { echo "Paperclip original compose missing" >&2; exit 1; }
# Preserve original data directory under paperclip/data/docker-paperclip.
mkdir -p "$PC/data/docker-paperclip"
cat > "$PC/compose.prebuilt.yml" <<'YAML'
name: ai-paperclip
services:
  paperclip:
    image: ghcr.io/paperclipai/paperclip:latest
    restart: unless-stopped
    init: true
    pids_limit: 2048
    stop_grace_period: 90s
    ports:
      - "127.0.0.1:3100:3100"
    environment:
      HOST: "0.0.0.0"
      PAPERCLIP_HOME: "/paperclip"
      PAPERCLIP_DEPLOYMENT_MODE: "authenticated"
      PAPERCLIP_DEPLOYMENT_EXPOSURE: "private"
      PAPERCLIP_PUBLIC_URL: "http://localhost:3100"
      BETTER_AUTH_SECRET: "${BETTER_AUTH_SECRET:?}"
      PAPERCLIP_TOOL_ACTION_SIGNING_SECRET: "${PAPERCLIP_TOOL_ACTION_SIGNING_SECRET:?}"
      OPENAI_API_KEY: "${OPENAI_API_KEY:-}"
      ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY:-}"
    volumes:
      - ./data/docker-paperclip:/paperclip
    security_opt:
      - no-new-privileges:true
YAML
echo "[1/3] Pulling upstream prebuilt Paperclip image (no source build)..."
docker pull ghcr.io/paperclipai/paperclip:latest
echo "[2/3] Starting ONLY Paperclip. Existing state and other containers remain untouched."
cd "$PC"
docker compose -p ai-paperclip --env-file "$ENV" -f compose.prebuilt.yml up -d --no-build
echo "[3/3] Checking status..."
ready=0
for _ in $(seq 1 25); do
 if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3100/; then
   ready=1; break
 fi
 sleep 2
done
echo "=== AI Business OS containers ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "=== Paperclip recent logs ==="
docker compose -p ai-paperclip --env-file "$ENV" -f compose.prebuilt.yml logs --tail=25 paperclip | sed -E 's/(sk-[A-Za-z0-9_-]{12,})/[REDACTED]/g'
if [ "$ready" -ne 1 ]; then
 echo "Paperclip not ready yet. Share sanitized status/logs, not secrets." >&2
 exit 1
fi
printf '\nSUCCESS: Paperclip started using prebuilt image, no local pnpm build.\n'
printf 'On your Mac, run: ssh -N -L 3100:127.0.0.1:3100 -L 5678:127.0.0.1:5678 root@103.77.209.147\n'
printf 'Then browse http://localhost:3100 (Paperclip), http://localhost:5678 (n8n).\n'
printf 'AI Gateway remains at localhost:8877. No paid provider keys connected automatically.\n'
