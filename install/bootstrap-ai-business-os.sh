#!/usr/bin/env bash
# AI Business OS: private VPS bootstrap (Ubuntu/Debian). Do not use on game VPS.
set -Eeuo pipefail
trap 'echo "[AI Business OS] ERROR near line $LINENO" >&2' ERR
umask 077
export DEBIAN_FRONTEND=noninteractive
fail(){ echo "ERROR: $*" >&2; exit 1; }
test "$(id -u)" -eq 0 || fail "Run with sudo or root."
. /etc/os-release
case "$ID" in ubuntu|debian) ;; *) fail "Ubuntu/Debian required";; esac
test -d /run/systemd/system || fail "systemd required"
test "$(awk '/MemTotal:/{print $2}' /proc/meminfo)" -ge 3145728 || fail "At least 3 GB RAM required; 8 GB recommended."
test "$(df -Pk /opt | awk 'NR==2{print $4}')" -ge 9437184 || fail "At least 9 GB free disk required."
BASE=/opt/ai-business-os
SRC=$BASE/source
GW=$SRC/ops/ai-business-os
PC=$BASE/paperclip
N8N=$BASE/n8n
mkdir -p "$BASE" "$N8N"
chmod 700 "$BASE"
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -Eiq 'hieusro|silkroad|gameworld|v188'; then
  fail "Game containers detected; installation blocked."
fi

echo "[1/5] Installing SSH, GitHub CLI and Docker prerequisites"
apt-get update -qq
apt-get install -y -qq ca-certificates curl git gh gnupg openssl python3 openssh-server >/dev/null
systemctl enable --now ssh >/dev/null 2>&1 || true
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /tmp/business-docker.gpg
  gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg /tmp/business-docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' "$(dpkg --print-architecture)" "$ID" "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi
systemctl enable --now docker >/dev/null

echo "[2/5] Getting private AI Gateway. GitHub may ask for ONE browser confirmation."
if test ! -d "$SRC/.git"; then
  export GH_CONFIG_DIR=$BASE/.gh-once
  mkdir -p "$GH_CONFIG_DIR"
  chmod 700 "$GH_CONFIG_DIR"
  gh auth login --hostname github.com --git-protocol https --web --scopes repo
  export AI_GITHUB_TOKEN="$(gh auth token --hostname github.com)"
  test -n "$AI_GITHUB_TOKEN" || fail "GitHub login failed."
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=credential.helper
  export GIT_CONFIG_VALUE_0='!f() { if [ "$1" = get ]; then echo username=x-access-token; echo "password=$AI_GITHUB_TOKEN"; fi; }; f'
  git clone -q --filter=blob:none --no-checkout --single-branch -b ai-business-os-20261023 https://github.com/traanviet3010-ux/V188.git "$SRC"
  git -C "$SRC" sparse-checkout init --cone
  git -C "$SRC" sparse-checkout set ops/ai-business-os
  git -C "$SRC" checkout -q ai-business-os-20261023
  unset AI_GITHUB_TOKEN GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0
  rm -rf "$GH_CONFIG_DIR"
  unset GH_CONFIG_DIR
fi
test -f "$GW/compose.shared.yaml" || fail "Gateway source missing."
if test ! -f "$GW/.env"; then
  export GW BASE
  python3 - <<'PY'
import os,base64,hashlib,secrets
from pathlib import Path
pw=secrets.token_urlsafe(26)
salt=secrets.token_bytes(20)
n=430000
d=hashlib.pbkdf2_hmac('sha256',pw.encode(),salt,n)
h='pbkdf2_sha256$%d$%s$%s'%(n,base64.urlsafe_b64encode(salt).decode(),base64.urlsafe_b64encode(d).decode())
p=Path(os.environ['GW'])/'.env'
p.write_text('\n'.join([
'GATEWAY_API_KEY='+secrets.token_urlsafe(48),
'OWNER_APPROVAL_KEY='+secrets.token_urlsafe(48),
'DEMO_MODE=0',
'AI_TIMEOUT_SECONDS=45',
'OPENAI_API_KEY=','DEEPSEEK_API_KEY=','ANTHROPIC_API_KEY=','GEMINI_API_KEY=',
'WEB_SESSION_KEY='+secrets.token_urlsafe(45),
"WEB_ADMIN_PASSWORD_HASH='"+h+"'",'']))
p.chmod(0o600)
f=Path(os.environ['BASE'])/'FIRST_LOGIN.txt'
f.write_text('Owner gateway password: '+pw+'\nKeep private. Use HTTPS to access the owner dashboard.\n')
f.chmod(0o600)
PY
fi

echo "[3/5] Building real-mode AI Gateway on localhost:8877"
(cd "$GW" && docker compose -p ai-business-os -f compose.shared.yaml up -d --build --no-deps ai-router)

echo "[4/5] Installing n8n on localhost:5678"
if test ! -f "$N8N/.env"; then
  printf 'N8N_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)" > "$N8N/.env"
  chmod 600 "$N8N/.env"
fi
cat > "$N8N/compose.yaml" <<'YAML'
name: ai-n8n
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      N8N_ENCRYPTION_KEY: $N8N_ENCRYPTION_KEY
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: "true"
      N8N_RUNNERS_ENABLED: "true"
      GENERIC_TIMEZONE: Asia/Bangkok
      TZ: Asia/Bangkok
    volumes:
      - data:/home/node/.n8n
    security_opt:
      - no-new-privileges:true
volumes:
  data:
YAML
(cd "$N8N" && docker compose -p ai-n8n --env-file .env up -d)

echo "[5/5] Installing official Paperclip on localhost:3100"
if test ! -d "$PC/.git"; then git clone -q --depth 1 https://github.com/paperclipai/paperclip.git "$PC"; fi
test -f "$PC/docker/docker-compose.quickstart.yml" || fail "Paperclip compose file missing."
if test ! -f "$PC/docker/.env"; then
  cat > "$PC/docker/.env" <<EOF
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=$(openssl rand -hex 32)
PAPERCLIP_PORT=127.0.0.1:3100
PAPERCLIP_DATA_DIR=../data/docker-paperclip
PAPERCLIP_PUBLIC_URL=http://localhost:3100
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
EOF
  chmod 600 "$PC/docker/.env"
fi
(cd "$PC" && docker compose -p ai-paperclip --env-file docker/.env -f docker/docker-compose.quickstart.yml up -d --build)
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "INSTALLED. Private ports: Paperclip 3100; n8n 5678; AI Gateway 8877."
echo "Mac SSH tunnel: ssh -N -L 3100:127.0.0.1:3100 -L 5678:127.0.0.1:5678 USER@103.77.209.147"
echo "Open http://localhost:3100 and http://localhost:5678 on your computer."
echo "No API keys connected, no simulations. GitHub runner and MCP links require later configuration."
