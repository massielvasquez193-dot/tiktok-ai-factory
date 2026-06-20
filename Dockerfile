# TikTok AI Factory — Production Docker Image
# Build: docker build -t tiktok-factory:latest .
# Run:   docker compose -f docker-compose.prod.yml up -d

FROM node:22-alpine

LABEL app="tiktok-ai-factory" version="2.1"

# System deps
RUN apk add --no-cache python3 py3-pip ffmpeg tesseract-ocr curl bash postgresql-client

# Python tools
RUN pip3 install yt-dlp openai-whisper --break-system-packages 2>/dev/null || true

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm install --production

# Prisma
COPY apps/server/prisma apps/server/prisma
RUN cd apps/server && npx prisma generate

# Source code
COPY . .

# Build frontend
RUN cd apps/web && npm run build

# Init script
RUN echo '#!/bin/sh\ncd /app/apps/server && npx prisma db push --skip-generate\ncd /app && npm run dev' > /start.sh && chmod +x /start.sh

EXPOSE 3000 4000

CMD ["/start.sh"]
