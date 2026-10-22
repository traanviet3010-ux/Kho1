FROM node:24.18.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends procps ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY lib.mjs server.mjs ./
COPY public ./public
RUN mkdir -p /app/runtime-data && chown -R node:node /app
USER node
ENV NODE_ENV=production
ENV DATA_DIR=/app/runtime-data
ENV MAX_UPLOAD_MB=75
ENV REA_TIMEOUT_MS=180000
EXPOSE 10000
CMD ["node", "server.mjs"]
