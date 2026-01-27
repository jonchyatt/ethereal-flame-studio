# Ethereal Flame Studio - Headless Render Container
#
# Provides a complete rendering environment with:
# - Node.js 20
# - Chromium for headless rendering
# - xvfb for virtual display
# - FFmpeg for video encoding
# - Python + spatialmedia for VR metadata
#
# Phase 3, Plan 03-07

FROM node:20-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Chromium for headless rendering
    chromium \
    # Virtual framebuffer for headless GPU
    xvfb \
    # Video encoding
    ffmpeg \
    # Python for VR metadata
    python3 \
    python3-pip \
    python3-venv \
    # Common utilities
    curl \
    wget \
    git \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install spatial-media for VR metadata injection
RUN pip3 install --break-system-packages spatialmedia

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Create directories for jobs and output
RUN mkdir -p /app/jobs/pending /app/jobs/processing /app/jobs/complete /app/jobs/failed
RUN mkdir -p /app/output

# Expose volumes for job input/output
VOLUME ["/app/jobs", "/app/output"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Default command: start render server with xvfb
CMD ["xvfb-run", "-s", "-ac -screen 0 1920x1080x24", "node", "scripts/render-server.js"]
