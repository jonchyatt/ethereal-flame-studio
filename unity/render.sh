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
HEADED=false            # true = drop -batchmode (GUI licenses Personal where batchmode cannot on pinned 2021.2.8f1)
SKIP_SPECTRUM_BAKE=false # true = fall back to realtime GetSpectrumData (pre-fix behavior, freezes under frame-lock)
BAKED_GAIN=""            # calibration override for AudioSpectrum.BakedGain (punch-tuning sweep)

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

# -- Normalize Recorder frame names to ffmpeg's frame_%06d.png sequence --
normalize_frame_sequence() {
    local frames_dir="$1"

    if [ -f "$frames_dir/frame_000000.png" ]; then
        return 0
    fi

    mapfile -t frames < <(find "$frames_dir" -maxdepth 1 -type f -name 'frame_*.png' | sort -V)
    if [ "${#frames[@]}" -eq 0 ]; then
        echo "ERROR: No PNG frames found in $frames_dir"
        return 1
    fi

    local staging_dir="$frames_dir/.renumbered"
    if [ -e "$staging_dir" ]; then
        echo "ERROR: Frame renumber staging path already exists: $staging_dir"
        return 1
    fi

    mkdir -p "$staging_dir"

    local frame
    local target
    local index=0
    for frame in "${frames[@]}"; do
        printf -v target "%s/frame_%06d.png" "$staging_dir" "$index"
        mv "$frame" "$target"
        index=$((index + 1))
    done

    mv "$staging_dir"/frame_*.png "$frames_dir"/
    rmdir "$staging_dir"
}

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
        --headed)    HEADED=true; shift ;;
        --no-spectrum-bake) SKIP_SPECTRUM_BAKE=true; shift ;;
        --baked-gain) BAKED_GAIN="$2"; shift 2 ;;
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
            echo "  --no-spectrum-bake  Use realtime GetSpectrumData (pre-fix, freezes reactivity under frame-lock)"
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
    echo "[Step 1/4] Starting Unity batch render..."
    START_TIME=$(date +%s)

    PRESET_ARG=""
    if [ -n "$PRESET" ]; then
        PRESET_ARG="-preset $PRESET"
    fi

    BATCH_FLAG="-batchmode"
    if [ "$HEADED" = true ]; then
        BATCH_FLAG=""
        echo "[Step 1/4] HEADED mode — running WITH GUI (no -batchmode) so Personal licensing works on pinned 2021.2.8f1"
    fi

    AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE")
    echo "[Step 1/4] Audio duration from ffprobe: ${AUDIO_DURATION}s"

    SPECTRUM_ARG=""
    if [ "$SKIP_SPECTRUM_BAKE" = false ]; then
        TOTAL_FRAMES=$(python3 -c "print(max(1, round(${AUDIO_DURATION} * ${FRAMERATE})))")
        SPECTRUM_FILE="$OUTPUT_DIR/${OUTPUT_NAME}_spectrum.json"
        echo "[Step 1/4] Baking per-frame audio spectrum ($TOTAL_FRAMES frames) -> $SPECTRUM_FILE"
        python3 "$SCRIPT_DIR/Scripts/bake_spectrum.py" \
            --audio "$AUDIO_FILE" \
            --fps "$FRAMERATE" \
            --frames "$TOTAL_FRAMES" \
            --bands 8 \
            --spectrum-size 1024 \
            --out "$SPECTRUM_FILE"
        SPECTRUM_ARG="-spectrumFile $SPECTRUM_FILE"
    else
        echo "[Step 1/4] Spectrum bake skipped (--no-spectrum-bake) — reactivity will use realtime GetSpectrumData"
    fi

    GAIN_ARG=""
    if [ -n "$BAKED_GAIN" ]; then
        GAIN_ARG="-bakedGain $BAKED_GAIN"
        echo "[Step 1/4] AudioSpectrum.BakedGain override: $BAKED_GAIN"
    fi

    "$UNITY_EXE" \
        $BATCH_FLAG \
        -projectPath "$PROJECT_PATH" \
        -executeMethod AutoRecorder.BatchRender \
        -audioFile "$AUDIO_FILE" \
        -audioDuration "$AUDIO_DURATION" \
        -outputDir "$OUTPUT_DIR" \
        -outputName "$OUTPUT_NAME" \
        -mode "$MODE" \
        -resolution "$RESOLUTION" \
        -framerate "$FRAMERATE" \
        -stereoSeparation "$STEREO_SEP" \
        -scene "$SCENE" \
        $PRESET_ARG \
        $SPECTRUM_ARG \
        $GAIN_ARG \
        -logFile "$OUTPUT_DIR/${OUTPUT_NAME}_unity.log"

    UNITY_EXIT=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    if [ $UNITY_EXIT -ne 0 ]; then
        echo "ERROR: Unity render failed (exit code $UNITY_EXIT)"
        echo "Check log: $OUTPUT_DIR/${OUTPUT_NAME}_unity.log"
        exit $UNITY_EXIT
    fi

    echo "[Step 1/4] Unity render complete (${DURATION}s)"
else
    echo "[Step 1/4] Skipped (--skip-render)"
fi

# -- Step 2: Assemble MP4 from PNG frames + source audio --
VIDEO_FILE="$OUTPUT_DIR/${OUTPUT_NAME}.mp4"
FRAMES_DIR="$OUTPUT_DIR/${OUTPUT_NAME}_frames"
FRAME_PATTERN="$FRAMES_DIR/frame_%06d.png"

echo ""
echo "[Step 2/4] Assembling MP4 from PNG frames and source audio..."

if [ ! -d "$FRAMES_DIR" ]; then
    echo "ERROR: Frame directory not found: $FRAMES_DIR"
    exit 1
fi

normalize_frame_sequence "$FRAMES_DIR"

ffmpeg -y \
    -framerate "$FRAMERATE" \
    -i "$FRAME_PATTERN" \
    -i "$AUDIO_FILE" \
    -map 0:v:0 \
    -map 1:a:0 \
    -c:v libx264 \
    -pix_fmt yuv420p \
    -c:a aac \
    -shortest \
    -movflags +faststart \
    "$VIDEO_FILE"

echo "[Step 2/4] MP4 assembled: $VIDEO_FILE"

# -- Step 3: VR Metadata Injection --
VR_VIDEO_FILE="$OUTPUT_DIR/${OUTPUT_NAME}_vr.mp4"

if [ "$INJECT_VR_META" = true ] && [[ "$MODE" == 360* ]]; then
    echo ""
    echo "[Step 3/4] Injecting VR metadata..."

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
            echo "[Step 3/4] VR metadata injected: $VR_VIDEO_FILE"
        else
            echo "WARNING: ffmpeg metadata injection failed"
            VR_VIDEO_FILE="$VIDEO_FILE"
        fi
    fi
else
    echo "[Step 3/4] Skipped (flat mode or --no-meta)"
    VR_VIDEO_FILE="$VIDEO_FILE"
fi

# -- Step 4: Summary --
echo ""
echo "[Step 4/4] Pipeline complete!"
echo "============================================"
echo "  Output video: $VR_VIDEO_FILE"
if [ -f "$VR_VIDEO_FILE" ]; then
    SIZE=$(du -sh "$VR_VIDEO_FILE" | cut -f1)
    echo "  File size:    $SIZE"
fi
echo "  PNG frames:   $FRAMES_DIR"
echo "============================================"
echo ""
echo "Next steps:"
echo "  - Upload to R2:  rclone copy \"$VR_VIDEO_FILE\" r2:efs-renders/"
echo "  - Upload to YouTube via Chrome MCP"
echo "  - Or run the full publish pipeline"
