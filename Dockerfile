# syntax=docker/dockerfile:1.6

########################
# 1) Build stage
########################
# Use full Debian-based Node image for builds (has more tooling available)
FROM node:20-bookworm AS build
WORKDIR /app

# Install deps (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

########################
# 2) Runtime stage (Debian slim)
########################
# Slim runtime image (Debian bookworm-slim variant)
FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
# DogeUB documents PORT via env in copy.env
ENV PORT=3000

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only what runtime needs:
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/messagesApi.js ./messagesApi.js

# Optional files seen in repo root (safe to include)
COPY --from=build /app/masqr.js ./masqr.js
COPY --from=build /app/Checkfailed.html ./Checkfailed.html
COPY --from=build /app/placeholder.svg ./placeholder.svg

# Run as non-root (the official node image defines a 'node' user)
COPY --chmod=755 entrypoint.sh ./entrypoint.sh

# Start as root only long enough to fix ownership of the persistent volume,
# then entrypoint.sh drops privileges and runs the API as the unprivileged node user.
USER root

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
