# Ethereal Flame Whisper Service
# GPU-accelerated audio transcription container
#
# Phase 4, Plan 04-04

FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .

# Pre-download model (optional, speeds up first request)
# Uncomment to include model in image (adds ~3GB to image size)
# RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('large-v3', device='cpu')"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

EXPOSE 8001

CMD ["python3", "main.py"]
