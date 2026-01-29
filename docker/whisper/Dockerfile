# =============================================================================
# Faster-Whisper Transcription Service
# =============================================================================
# GPU-accelerated audio transcription using CTranslate2
# Exposes REST API for transcription requests
# =============================================================================

FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

LABEL maintainer="Ethereal Flame Studio"
LABEL description="Faster-Whisper transcription service with GPU support"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN useradd -m -u 1000 whisper

# Set working directory
WORKDIR /app

# Install Python dependencies
# Using --no-cache-dir to reduce image size
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir \
    faster-whisper>=1.0.0 \
    fastapi>=0.109.0 \
    uvicorn[standard]>=0.27.0 \
    python-multipart>=0.0.6

# Copy application code
COPY --chown=whisper:whisper server.py .

# Create cache directory for models
RUN mkdir -p /root/.cache/huggingface && chown -R whisper:whisper /root/.cache

# Switch to non-root user
# Note: Running as root for now due to CUDA library access requirements
# USER whisper

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Expose API port
EXPOSE 9000

# Environment variables with defaults
ENV WHISPER_MODEL=large-v3
ENV WHISPER_DEVICE=cuda
ENV WHISPER_COMPUTE_TYPE=float16
ENV WHISPER_BEAM_SIZE=5
ENV WHISPER_LANGUAGE=en

# Run the server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "9000", "--workers", "1"]
