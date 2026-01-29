# =============================================================================
# Ethereal Flame Studio - Render Worker
# =============================================================================
# BullMQ worker for processing video render jobs
# GPU-accelerated with NVENC support for encoding
# =============================================================================

# Build stage - compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

LABEL maintainer="Ethereal Flame Studio"
LABEL description="Video render worker with GPU acceleration"

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Node.js
    curl \
    gnupg \
    # FFmpeg with NVENC support
    ffmpeg \
    # Headless Chrome dependencies (for Puppeteer/Playwright if needed)
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    # rclone for Google Drive sync
    rclone \
    # Utilities
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 render

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create required directories
RUN mkdir -p /renders /tmp/renders /data /config \
    && chown -R render:render /app /renders /tmp/renders /data

# Note: Static assets (public/, templates/) should be added to build context if needed

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose API port
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production
ENV MACHINE_ID=default
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV QUEUE_CONCURRENCY=1
ENV RENDER_OUTPUT_DIR=/renders
ENV RENDER_TEMP_DIR=/tmp/renders

# Switch to non-root user
USER render

# Start the render worker
CMD ["node", "dist/render-worker/index.js"]
