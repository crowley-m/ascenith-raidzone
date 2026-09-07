# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- install all deps (incl dev, for the build) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build the Next app ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholders so `next build` / prisma generate don't fail; real values come at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXTAUTH_SECRET="placeholder-build-secret"
RUN npm run build

# ---- production node_modules only ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# ---- final image (runs both `web` and `bot` via different commands) ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
