# sherrybuilds-portfolio — multi-stage Next.js (classic `next start`, no standalone)
# Port 3000. Uses next binaries directly to avoid npm-wrapper zombie (ecosystem fix).
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# `service` is what deploy/vps-pull-release.sh filters on when pruning old
# images; the OCI revision label is added by CI (build-push-action) and is
# what /up reports as the live commit.
LABEL service="sherrybuilds-portfolio"

# Copy deps
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
# Copy built app
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
# Copy config
COPY --chown=node:node next.config.ts ./next.config.ts

# Run unprivileged; .next is node-owned for the image-optimizer cache
USER node

EXPOSE 3000
# /up is the dependency-free health route (src/app/up/route.ts). Probing `/`
# rendered the whole WebGL landing page every 30s for a liveness answer.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD wget -qO- http://127.0.0.1:3000/up || exit 1

# Classic `next start` on port 3000 (matched with next.config.ts output:undefined)
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
