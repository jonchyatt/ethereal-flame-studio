"""
Faster-Whisper Transcription Service

REST API for audio transcription using faster-whisper (CTranslate2).
Provides GPU-accelerated transcription for generating video descriptions.

Endpoints:
    GET  /health     - Service health check
    POST /transcribe - Transcribe audio file
    GET  /info       - Model and system information
"""

import os
import tempfile
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("whisper-service")

# Global model instance
model = None


class TranscriptionResponse(BaseModel):
    """Response model for transcription endpoint."""
    text: str
    language: str
    language_probability: float
    duration: float
    segments: Optional[list] = None


class HealthResponse(BaseModel):
    """Response model for health endpoint."""
    status: str
    model: str
    device: str
    compute_type: str


class InfoResponse(BaseModel):
    """Response model for info endpoint."""
    model: str
    device: str
    compute_type: str
    beam_size: int
    language: Optional[str]
    supported_languages: list


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - loads model on startup."""
    global model

    model_name = os.getenv("WHISPER_MODEL", "large-v3")
    device = os.getenv("WHISPER_DEVICE", "cuda")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "float16")

    logger.info(f"Loading Whisper model: {model_name} on {device} ({compute_type})")

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(
            model_name,
            device=device,
            compute_type=compute_type,
            download_root=os.getenv("WHISPER_CACHE_DIR", "/root/.cache/huggingface")
        )
        logger.info(f"Model {model_name} loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down whisper service")
    model = None


# Create FastAPI app
app = FastAPI(
    title="Faster-Whisper Transcription Service",
    description="GPU-accelerated audio transcription API",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns service status and model information.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return HealthResponse(
        status="ok",
        model=os.getenv("WHISPER_MODEL", "large-v3"),
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16")
    )


@app.get("/info", response_model=InfoResponse)
async def get_info():
    """
    Get detailed service information.

    Returns model configuration and supported languages.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Common languages supported by Whisper
    supported_languages = [
        "en", "zh", "de", "es", "ru", "ko", "fr", "ja", "pt", "tr",
        "pl", "ca", "nl", "ar", "sv", "it", "id", "hi", "fi", "vi",
        "he", "uk", "el", "ms", "cs", "ro", "da", "hu", "ta", "no",
        "th", "ur", "hr", "bg", "lt", "la", "mi", "ml", "cy", "sk",
        "te", "fa", "lv", "bn", "sr", "az", "sl", "kn", "et", "mk",
        "br", "eu", "is", "hy", "ne", "mn", "bs", "kk", "sq", "sw",
        "gl", "mr", "pa", "si", "km", "sn", "yo", "so", "af", "oc",
        "ka", "be", "tg", "sd", "gu", "am", "yi", "lo", "uz", "fo",
        "ht", "ps", "tk", "nn", "mt", "sa", "lb", "my", "bo", "tl",
        "mg", "as", "tt", "haw", "ln", "ha", "ba", "jw", "su"
    ]

    return InfoResponse(
        model=os.getenv("WHISPER_MODEL", "large-v3"),
        device=os.getenv("WHISPER_DEVICE", "cuda"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "float16"),
        beam_size=int(os.getenv("WHISPER_BEAM_SIZE", "5")),
        language=os.getenv("WHISPER_LANGUAGE") or None,
        supported_languages=supported_languages
    )


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Query(
        None,
        description="Language code (e.g., 'en', 'es'). Auto-detect if not specified."
    ),
    include_segments: bool = Query(
        False,
        description="Include word-level segments in response"
    ),
    beam_size: Optional[int] = Query(
        None,
        description="Beam size for transcription (higher = more accurate, slower)"
    )
):
    """
    Transcribe an audio file.

    Accepts audio files in formats supported by FFmpeg (mp3, wav, m4a, etc.).
    Returns transcribed text and metadata.

    Args:
        file: Audio file to transcribe
        language: Optional language code for transcription
        include_segments: Whether to include word-level segments
        beam_size: Override default beam size

    Returns:
        Transcription result with text, language, and duration
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    allowed_extensions = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".wma", ".aac"}
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {allowed_extensions}"
        )

    # Save uploaded file to temp location
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to process uploaded file")

    try:
        # Get transcription parameters
        effective_beam_size = beam_size or int(os.getenv("WHISPER_BEAM_SIZE", "5"))
        effective_language = language or os.getenv("WHISPER_LANGUAGE") or None

        logger.info(
            f"Transcribing {file.filename} "
            f"(language={effective_language}, beam_size={effective_beam_size})"
        )

        # Perform transcription
        segments_iter, info = model.transcribe(
            tmp_path,
            beam_size=effective_beam_size,
            language=effective_language,
            vad_filter=True,  # Filter out non-speech
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=400
            )
        )

        # Collect segments
        segments_list = list(segments_iter)
        full_text = " ".join([seg.text.strip() for seg in segments_list])

        # Build response
        response = TranscriptionResponse(
            text=full_text,
            language=info.language,
            language_probability=info.language_probability,
            duration=info.duration
        )

        # Include segments if requested
        if include_segments:
            response.segments = [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text.strip(),
                    "avg_logprob": seg.avg_logprob
                }
                for seg in segments_list
            ]

        logger.info(
            f"Transcription complete: {len(full_text)} chars, "
            f"{info.duration:.1f}s, language={info.language}"
        )

        return response

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
