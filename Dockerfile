# --- Dependencies ----------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 ships prebuilt binaries in its npm package (no compiler
# needed), but npm still auto-invokes node-gyp because a binding.gyp file is
# present; --ignore-scripts skips that unnecessary (and here, unavailable)
# native build step. --legacy-peer-deps works around next-auth's declared
# peer range not yet covering the Next.js canary version this project pins.
RUN npm ci --ignore-scripts --legacy-peer-deps

# --- Build -------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time-only placeholders so `next build` never fails on missing env
# vars; real values are supplied at container runtime via docker-compose.
ENV ADMIN_EMAIL=build@example.com
ENV NEXTAUTH_SECRET=build-time-placeholder
RUN npm run build

# --- Runtime -----------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3012
ENV HOSTNAME=0.0.0.0

RUN useradd --system --uid 1001 nextjs

# Next.js standalone output: a minimal server.js plus only the node_modules
# actually required at runtime (includes the better-sqlite3 native addon).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p /data/db /data/books /backup && chown -R nextjs:nextjs /data /backup /app

USER nextjs
EXPOSE 3012

CMD ["node", "server.js"]
