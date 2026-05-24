FROM node:22-slim AS builder
WORKDIR /app

# Install bun for dependencies
RUN npm install -g bun

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy app source
COPY . .

# Build Nuxt app
RUN bun run build

# Production image
FROM node:22-slim AS release
WORKDIR /app

# Install puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libexpat1 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy built output
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3001

CMD ["node", ".output/server/index.mjs"]
