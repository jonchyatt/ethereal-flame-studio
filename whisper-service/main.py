"""
Ethereal Flame Whisper Service

GPU-accelerated audio transcription using faster-whisper.
Provides video descriptions for YouTube and social media.

Phase 4, Plan 04-04
"""

import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel

app = FastAPI(title="Ethereal Flame Whisper Service")

# Model configuration
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")  # cuda or cpu
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16")  # float16, int8, or float32

# Lazy model loading
_model: Optional[WhisperModel] = None


def get_model() -> WhisperModel:
    """Get or initialize the Whisper model."""
    global _model
    if _model is None:
        print(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} ({COMPUTE_TYPE})...")
        _model = WhisperModel(
            MODEL_SIZE,
            device=DEVICE,
            compute_type=COMPUTE_TYPE
        )
        print("Model loaded successfully")
    return _model


class TranscriptionResult(BaseModel):
    """Response model for transcription results."""
    text: str
    language: str
    duration_seconds: float
    segments_count: int


class TranscriptionRequest(BaseModel):
    """Request model for path-based transcription."""
    audio_path: str
    language: Optional[str] = None  # Auto-detect if not specified


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_file(file: UploadFile = File(...)):
    """
    Transcribe uploaded audio file and return text.
    Accepts: MP3, WAV, OGG, FLAC, M4A
    """
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    # Save to temp file (Whisper needs file path)
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model = get_model()

        # Transcribe with beam search for better accuracy
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            word_timestamps=False,  # Not needed for descriptions
            vad_filter=True,  # Filter out silence
        )

        # Collect all segments
        all_segments = list(segments)
        full_text = " ".join([seg.text.strip() for seg in all_segments])

        return TranscriptionResult(
            text=full_text,
            language=info.language,
            duration_seconds=info.duration,
            segments_count=len(all_segments)
        )

    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")

    finally:
        # Clean up temp file
        os.unlink(tmp_path)


@app.post("/transcribe-path", response_model=TranscriptionResult)
async def transcribe_path(request: TranscriptionRequest):
    """
    Transcribe audio file from local path (for internal use).
    Useful when audio is already on shared volume.
    """
    if not os.path.exists(request.audio_path):
        raise HTTPException(404, f"File not found: {request.audio_path}")

    try:
        model = get_model()

        segments, info = model.transcribe(
            request.audio_path,
            beam_size=5,
            language=request.language,
            vad_filter=True,
        )

        all_segments = list(segments)
        full_text = " ".join([seg.text.strip() for seg in all_segments])

        return TranscriptionResult(
            text=full_text,
            language=info.language,
            duration_seconds=info.duration,
            segments_count=len(all_segments)
        )

    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
