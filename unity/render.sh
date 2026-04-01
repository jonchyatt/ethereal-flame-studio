#!/bin/bash
# =============================================================================
# Ethereal Flame Studio — Automated VR Video Render Pipeline
#
# Chains: Audio → Unity Recorder → ffmpeg VR metadata → Output
#
# Usage:
#   ./render.sh --audio /path/to/audio.wav --name "meditation_001"
#   ./render.sh --audio /path/to/audio.wav --name "vid" --mode 360stereo --res 4096 --fps 30
#   ./render.sh --audio /path/to/audio.wav --name "vid" --mode flat --res 1920
#
# Prerequisites:
#   - Unity 2021.2.8f1 installed
#   - ffmpeg on PATH
#   - UNITY_PATH environment variable (or auto-detected)
# =============================================================================

set -euo pipefail

# -- Defaults --
AUDIO_FILE=""
OUTPUT_NAME="efs_render"
MODE="360stereo"         # 360stereo | 360mono | flat
RESOLUTION=4096
FRAMERATE=30
STEREO_SEP=0.065
SCENE="Example"
PRESET=""
OUTPUT_DIR=""
INJECT_VR_META=true
SKIP_RENDER=false

# -- Detect Unity path --
detect_unity() {
    if [ -n "${UNITY_PATH:-}" ] && [ -f "$UNITY_PATH" ]; then
        echo "$UNITY_PATH"
        return
    fi

    # Common Windows paths
    for path in \
        "C:/Program Files/Unity/Hub/Editor/2021.2.8f1/Editor/Unity.exe" \
        "C:/Program Files/Unity/Hub/Editor/"*/Editor/Unity.exe \
        "/c/Program Files/Unity/Hub/Editor/2021.2.8f1/Editor/Unity.exe"; do
        if [ -f "$path" ]; then
            echo "$path"
            return
        fi
    done

    echo ""
}

# -- Detect project path --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$SCRIPT_DIR"

# -- Parse args --
while [[ $# -gt 0 ]]; do
    case $1 in
        --audio)     AUDIO_FILE="$2"; shift 2 ;;
        --name)      OUTPUT_NAME="$2"; shift 2 ;;
        --mode)      MODE="$2"; shift 2 ;;
        --res)       RESOLUTION="$2"; shift 2 ;;
        --fps)       FRAMERATE="$2"; shift 2 ;;
        --stereo)    STEREO_SEP="$2"; shift 2 ;;
        --preset)    PRESET="$2"; shift 2 ;;
        --scene)     SCENE="$2"; shift 2 ;;
        --output)    OUTPUT_DIR="$2"; shift 2 ;;
        --no-meta)   INJECT_VR_META=false; shift ;;
        --skip-render) SKIP_RENDER=true; shift ;;
        --help)
            echo "Usage: ./render.sh --audio <path> --name <name> [options]"
            echo "  --audio     Audio file path (WAV/MP3/OGG) [required]"
            echo "  --name      Output filename [default: efs_render]"
            echo "  --preset    Visual preset (meditation/edm/ambient/fire_cinema)"
            echo "  --mode      360stereo | 360mono | flat [default: 360stereo]"
            echo "  --res       Resolution [default: 4096]"
            echo "  --fps       Frame rate [default: 30]"
            echo "  --stereo    Stereo separation in meters [default: 0.065]"
            echo "  --scene     Unity scene name [default: Example]"
            echo "  --output    Output directory [default: project/Recordings]"
            echo "  --no-meta   Skip VR metadata injection"
            echo "  --skip-render  Skip Unity render (just do post-processing)"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# -- Validate --
if [ -z "$AUDIO_FILE" ]; then
    echo "ERROR: --audio is required"
    exit 1
fi

if [ ! -f "$AUDIO_FILE" ]; then
    echo "ERROR: Audio file not found: $AUDIO_FILE"
    exit 1
fi

UNITY_EXE=$(detect_unity)
if [ -z "$UNITY_EXE" ] && [ "$SKIP_RENDER" = false ]; then
    echo "ERROR: Unity not found. Set UNITY_PATH environment variable."
    exit 1
fi

if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="$PROJECT_PATH/Recordings"
fi
mkdir -p "$OUTPUT_DIR"

echo "============================================"
echo "  Ethereal Flame Studio — Render Pipeline"
echo "============================================"
echo "  Audio:      $AUDIO_FILE"
echo "  Output:     $OUTPUT_DIR/$OUTPUT_NAME"
echo "  Mode:       $MODE"
echo "  Resolution: $RESOLUTION"
echo "  FPS:        $FRAMERATE"
echo "  Preset:     ${PRESET:-none}"
echo "  Scene:      $SCENE"
echo "  Unity:      $UNITY_EXE"
echo "============================================"

# -- Step 1: Unity Render --
if [ "$SKIP_RENDER" = false ]; then
    echo ""
    echo "[Step 1/3] Starting Unity batch render..."
    START_TIME=$(date +%s)

    PRESET_ARG=""
    if [ -n "$PRESET" ]; then
        PRESET_ARG="-preset $PRESET"
    fi

    "$UNITY_EXE" \
        -batchmode \
        -nographics \
        -projectPath "$PROJECT_PATH" \
        -executeMethod AutoRecorder.BatchRender \
        -audioFile "$AUDIO_FILE" \
        -outputDir "$OUTPUT_DIR" \
        -outputName "$OUTPUT_NAME" \
        -mode "$MODE" \
        -resolution "$RESOLUTION" \
        -framerate "$FRAMERATE" \
        -stereoSeparation "$STEREO_SEP" \
        -scene "$SCENE" \
        $PRESET_ARG \
        -logFile "$OUTPUT_DIR/${OUTPUT_NAME}_unity.log"

    UNITY_EXIT=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    if [ $UNITY_EXIT -ne 0 ]; then
        echo "ERROR: Unity render failed (exit code $UNITY_EXIT)"
        echo "Check log: $OUTPUT_DIR/${OUTPUT_NAME}_unity.log"
        exit $UNITY_EXIT
    fi

    echo "[Step 1/3] Unity render complete (${DURATION}s)"
else
    echo "[Step 1/3] Skipped (--skip-render)"
fi

# -- Step 2: VR Metadata Injection --
VIDEO_FILE="$OUTPUT_DIR/${OUTPUT_NAME}.mp4"
VR_VIDEO_FILE="$OUTPUT_DIR/${OUTPUT_NAME}_vr.mp4"

if [ "$INJECT_VR_META" = true ] && [[ "$MODE" == 360* ]]; then
    echo ""
    echo "[Step 2/3] Injecting VR metadata..."

    if [ ! -f "$VIDEO_FILE" ]; then
        echo "WARNING: Video file not found at $VIDEO_FILE — skipping metadata injection"
    else
        STEREO_MODE="none"
        if [ "$MODE" = "360stereo" ]; then
            STEREO_MODE="top_bottom"
        fi

        ffmpeg -y \
            -i "$VIDEO_FILE" \
            -c copy \
            -metadata:s:v:0 "spherical=true" \
            -metadata:s:v:0 "stitched=true" \
            -metadata:s:v:0 "stereo_mode=$STEREO_MODE" \
            "$VR_VIDEO_FILE" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo "[Step 2/3] VR metadata injected: $VR_VIDEO_FILE"
        else
            echo "WARNING: ffmpeg metadata injection failed"
            VR_VIDEO_FILE="$VIDEO_FILE"
        fi
    fi
else
    echo "[Step 2/3] Skipped (flat mode or --no-meta)"
    VR_VIDEO_FILE="$VIDEO_FILE"
fi

# -- Step 3: Summary --
echo ""
echo "[Step 3/3] Pipeline complete!"
echo "============================================"
echo "  Output video: $VR_VIDEO_FILE"
if [ -f "$VR_VIDEO_FILE" ]; then
    SIZE=$(du -sh "$VR_VIDEO_FILE" | cut -f1)
    echo "  File size:    $SIZE"
fi
echo "============================================"
echo ""
echo "Next steps:"
echo "  - Upload to R2:  rclone copy \"$VR_VIDEO_FILE\" r2:efs-renders/"
echo "  - Upload to YouTube via Chrome MCP"
echo "  - Or run the full publish pipeline"
