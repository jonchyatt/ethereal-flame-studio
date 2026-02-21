FROM node:20-slim

# Install ffmpeg and yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json ./
COPY worker/package.json worker/
RUN npm ci --workspace=worker

# Copy source
COPY . .

# Build worker
RUN cd worker && npm run build

CMD ["node", "worker/dist/index.js"]
