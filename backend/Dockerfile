# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (including devDependencies needed for the TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Stage 2: Production runtime ----------
FROM node:20-alpine AS production

# Security: run as a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from the build stage
COPY --from=builder /app/dist ./dist

# Writable directory for file attachments (mounted as a volume in docker-compose)
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads
ENV UPLOAD_DIR=/app/uploads

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
