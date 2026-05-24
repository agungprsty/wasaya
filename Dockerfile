FROM oven/bun:1 AS base
WORKDIR /app

# Install netcat for waiting on database
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY bun.lock package.json ./
RUN bun install

# Copy source code excluding the problematic validator.ts file
COPY . .
RUN rm -f types/validator.ts

# Build the app
RUN bun run build

# Production image
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=base /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["bun", "run", "start"]