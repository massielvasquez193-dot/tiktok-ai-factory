# Backend API Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
