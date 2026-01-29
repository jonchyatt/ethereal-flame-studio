# FFmpeg Command Templates for Ethereal Flame Studio

**Created:** 2026-01-28
**Purpose:** Copy-paste ready FFmpeg commands for the rendering pipeline
**GPU:** NVIDIA NVENC (RTX series recommended)

---

## Table of Contents

1. [Flat Exports (16:9 Landscape)](#1-flat-exports-169-landscape)
2. [Vertical Exports (9:16 Shorts/Reels)](#2-vertical-exports-916-shortsreels)
3. [360 Monoscopic](#3-360-monoscopic)
4. [360 Stereoscopic Top-Bottom](#4-360-stereoscopic-top-bottom)
5. [VR Metadata Injection](#5-vr-metadata-injection)
6. [Audio Extraction for Whisper](#6-audio-extraction-for-whisper)
7. [Thumbnail Extraction](#7-thumbnail-extraction)
8. [Video Concatenation](#8-video-concatenation)
9. [Quality Presets Reference](#9-quality-presets-reference)

---

## 1. Flat Exports (16:9 Landscape)

### 1080p 16:9 (YouTube Standard)

**Fast (preview/draft):**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v h264_nvenc -preset p4 -tune hq -rc vbr -cq 23 \
  -b:v 12M -maxrate 15M -bufsize 30M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart \
  -y output_1080p_fast.mp4
```

**Balanced (recommended):**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v h264_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 15M -maxrate 20M -bufsize 40M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -y output_1080p.mp4
```

**Quality (final render):**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v h264_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 20M -maxrate 25M -bufsize 50M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -y output_1080p_hq.mp4
```

### 4K 16:9 (YouTube 4K)

**Fast:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p4 -tune hq -rc vbr -cq 23 \
  -b:v 40M -maxrate 50M -bufsize 100M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_4k_fast.mp4
```

**Balanced:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 50M -maxrate 65M -bufsize 130M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_4k.mp4
```

**Quality:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 65M -maxrate 80M -bufsize 160M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_4k_hq.mp4
```

---

## 2. Vertical Exports (9:16 Shorts/Reels)

### 1080p 9:16 (YouTube Shorts / Instagram Reels / TikTok)

**Fast:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v h264_nvenc -preset p4 -tune hq -rc vbr -cq 23 \
  -b:v 12M -maxrate 15M -bufsize 30M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart \
  -y output_1080p_vertical_fast.mp4
```

**Balanced:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v h264_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 15M -maxrate 20M -bufsize 40M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -y output_1080p_vertical.mp4
```

**Quality:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v h264_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 20M -maxrate 25M -bufsize 50M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -y output_1080p_vertical_hq.mp4
```

### 4K 9:16 (High-Quality Vertical)

**Balanced:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -vf "scale=2160:3840:force_original_aspect_ratio=decrease,pad=2160:3840:(ow-iw)/2:(oh-ih)/2" \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 50M -maxrate 65M -bufsize 130M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_4k_vertical.mp4
```

**Quality:**
```bash
ffmpeg -framerate 60 -i frames/%05d.png \
  -i audio.mp3 \
  -vf "scale=2160:3840:force_original_aspect_ratio=decrease,pad=2160:3840:(ow-iw)/2:(oh-ih)/2" \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 65M -maxrate 80M -bufsize 160M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_4k_vertical_hq.mp4
```

---

## 3. 360 Monoscopic

### 4K 360 Mono (4096x2048)

**Balanced:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 45M -maxrate 60M -bufsize 120M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_4k_mono.mp4
```

**Quality:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 55M -maxrate 70M -bufsize 140M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_4k_mono_hq.mp4
```

### 6K 360 Mono (6144x3072)

**Balanced:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 65M -maxrate 85M -bufsize 170M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_6k_mono.mp4
```

**Quality:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 80M -maxrate 100M -bufsize 200M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_6k_mono_hq.mp4
```

### 8K 360 Mono (8192x4096)

**Balanced:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 100M -maxrate 130M -bufsize 260M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_8k_mono.mp4
```

**Quality:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 120M -maxrate 150M -bufsize 300M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_8k_mono_hq.mp4
```

---

## 4. 360 Stereoscopic Top-Bottom

**Note:** For stereoscopic VR, frames should already be stacked (left eye on top, right eye on bottom). The output aspect ratio is 1:1 for top-bottom stereo.

### 4K 360 Stereo (3840x3840 / per-eye 3840x1920)

**Balanced:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 55M -maxrate 70M -bufsize 140M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_4k_stereo.mp4
```

**Quality:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 70M -maxrate 90M -bufsize 180M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_4k_stereo_hq.mp4
```

### 8K 360 Stereo (7680x7680 / per-eye 7680x3840)

**Balanced:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p5 -tune hq -rc vbr -cq 20 \
  -b:v 100M -maxrate 130M -bufsize 260M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_8k_stereo.mp4
```

**Quality:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 130M -maxrate 160M -bufsize 320M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_8k_stereo_hq.mp4
```

### 8K 360 Stereo (8192x8192 / per-eye 8192x4096) - Maximum Quality

**Quality:**
```bash
ffmpeg -framerate 30 -i frames/%05d.png \
  -i audio.mp3 \
  -c:v hevc_nvenc -preset p7 -tune hq -rc vbr -cq 18 \
  -b:v 150M -maxrate 180M -bufsize 360M \
  -pix_fmt yuv420p \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -tag:v hvc1 \
  -y output_360_8k_stereo_max.mp4
```

---

## 5. VR Metadata Injection

**CRITICAL:** YouTube requires spatial metadata to recognize 360/VR video. FFmpeg cannot reliably inject this metadata. Use Google's Spatial Media Metadata Injector.

### Install Spatial Media Metadata Injector

```bash
# Clone the repository
git clone https://github.com/google/spatial-media.git
cd spatial-media

# Install Python dependencies
pip install .
```

### 360 Monoscopic Metadata

```bash
python spatialmedia -i input_360_mono.mp4 -o output_360_mono_vr.mp4 --spherical
```

### 360 Stereoscopic Top-Bottom Metadata

```bash
python spatialmedia -i input_360_stereo.mp4 -o output_360_stereo_vr.mp4 \
  --spherical \
  --stereo-mode top-bottom
```

### 360 Stereoscopic Side-by-Side Metadata (if needed)

```bash
python spatialmedia -i input_360_stereo_sbs.mp4 -o output_360_stereo_sbs_vr.mp4 \
  --spherical \
  --stereo-mode left-right
```

### VR180 Metadata

```bash
python spatialmedia -i input_vr180.mp4 -o output_vr180_vr.mp4 \
  --spherical \
  --v2 \
  --stereo-mode left-right \
  --field-of-view 180
```

### Batch Injection Script (PowerShell)

```powershell
# inject-vr-metadata.ps1
param(
    [string]$InputDir = ".\renders",
    [string]$OutputDir = ".\output",
    [ValidateSet("mono", "stereo-tb", "stereo-sbs")]
    [string]$Mode = "mono"
)

$stereoArg = switch ($Mode) {
    "mono" { "" }
    "stereo-tb" { "--stereo-mode top-bottom" }
    "stereo-sbs" { "--stereo-mode left-right" }
}

Get-ChildItem "$InputDir\*.mp4" | ForEach-Object {
    $outPath = Join-Path $OutputDir $_.Name
    $cmd = "python spatialmedia -i `"$($_.FullName)`" -o `"$outPath`" --spherical $stereoArg"
    Write-Host "Processing: $($_.Name)"
    Invoke-Expression $cmd
}
```

---

## 6. Audio Extraction for Whisper

### Extract Audio as WAV (Best for Whisper)

```bash
ffmpeg -i input_video.mp4 \
  -vn \
  -acodec pcm_s16le \
  -ar 16000 \
  -ac 1 \
  -y audio_for_whisper.wav
```

### Extract Audio as MP3 (Smaller file)

```bash
ffmpeg -i input_video.mp4 \
  -vn \
  -acodec libmp3lame \
  -ar 16000 \
  -ac 1 \
  -b:a 64k \
  -y audio_for_whisper.mp3
```

### Extract Audio Segment (with timestamps)

```bash
# Extract from 0:30 to 2:00
ffmpeg -i input_video.mp4 \
  -ss 00:00:30 -to 00:02:00 \
  -vn \
  -acodec pcm_s16le \
  -ar 16000 \
  -ac 1 \
  -y audio_segment.wav
```

### Batch Audio Extraction (PowerShell)

```powershell
# extract-audio-batch.ps1
Get-ChildItem ".\videos\*.mp4" | ForEach-Object {
    $outPath = ".\audio\$($_.BaseName).wav"
    ffmpeg -i "$($_.FullName)" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "$outPath"
}
```

---

## 7. Thumbnail Extraction

### Extract Single Frame at Timestamp

```bash
# Extract frame at 30 seconds
ffmpeg -i input_video.mp4 \
  -ss 00:00:30 \
  -vframes 1 \
  -q:v 2 \
  -y thumbnail.jpg
```

### Extract as PNG (Lossless)

```bash
ffmpeg -i input_video.mp4 \
  -ss 00:00:30 \
  -vframes 1 \
  -y thumbnail.png
```

### Extract Multiple Thumbnails (Every N Seconds)

```bash
# Extract 1 frame every 30 seconds
ffmpeg -i input_video.mp4 \
  -vf "fps=1/30" \
  -q:v 2 \
  thumbnails/thumb_%03d.jpg
```

### Extract at YouTube Recommended Resolution (1280x720)

```bash
ffmpeg -i input_video.mp4 \
  -ss 00:00:30 \
  -vframes 1 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -q:v 2 \
  -y thumbnail_yt.jpg
```

### Extract Best Frame from Interval (I-frame)

```bash
# Get the nearest I-frame to 30 seconds (faster, no re-encode)
ffmpeg -ss 00:00:30 -i input_video.mp4 \
  -vframes 1 \
  -q:v 2 \
  -y thumbnail_fast.jpg
```

### Batch Thumbnail Extraction (PowerShell)

```powershell
# extract-thumbnails.ps1
param(
    [string]$Timestamp = "00:00:30"
)

Get-ChildItem ".\videos\*.mp4" | ForEach-Object {
    $outPath = ".\thumbnails\$($_.BaseName)_thumb.jpg"
    ffmpeg -i "$($_.FullName)" -ss $Timestamp -vframes 1 -q:v 2 -y "$outPath"
}
```

---

## 8. Video Concatenation

### Method 1: Concat Demuxer (Recommended - No Re-encode)

**Create file list (input.txt):**
```
file 'video1.mp4'
file 'video2.mp4'
file 'video3.mp4'
```

**Concatenate:**
```bash
ffmpeg -f concat -safe 0 -i input.txt \
  -c copy \
  -movflags +faststart \
  -y output_concatenated.mp4
```

### Method 2: Concat Filter (When Re-encoding is OK)

```bash
ffmpeg -i video1.mp4 -i video2.mp4 -i video3.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" \
  -map "[outv]" -map "[outa]" \
  -c:v h264_nvenc -preset p5 -cq 20 \
  -c:a aac -b:a 384k \
  -movflags +faststart \
  -y output_concatenated.mp4
```

### Method 3: Intermediate TS Format (For Different Codecs)

```bash
# Convert all to transport stream
ffmpeg -i video1.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts intermediate1.ts
ffmpeg -i video2.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts intermediate2.ts
ffmpeg -i video3.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts intermediate3.ts

# Concatenate
ffmpeg -i "concat:intermediate1.ts|intermediate2.ts|intermediate3.ts" \
  -c copy \
  -bsf:a aac_adtstoasc \
  -movflags +faststart \
  -y output_concatenated.mp4

# Clean up
rm intermediate*.ts
```

### Batch Concat Script (PowerShell)

```powershell
# concat-videos.ps1
param(
    [string]$InputDir = ".\to_concat",
    [string]$OutputFile = ".\output_concatenated.mp4"
)

# Generate file list
$listFile = "concat_list.txt"
Get-ChildItem "$InputDir\*.mp4" | Sort-Object Name | ForEach-Object {
    "file '$($_.FullName)'" | Out-File -Append $listFile -Encoding utf8
}

# Concatenate
ffmpeg -f concat -safe 0 -i $listFile -c copy -movflags +faststart -y $OutputFile

# Clean up
Remove-Item $listFile
```

---

## 9. Quality Presets Reference

### NVENC Preset Mapping (RTX 30/40 Series)

| Preset | Speed | Quality | Use Case |
|--------|-------|---------|----------|
| p1 | Fastest | Lowest | Real-time streaming |
| p2 | Faster | Low | Quick preview |
| p3 | Fast | Medium-Low | Draft renders |
| p4 | Medium | Medium | Fast production |
| **p5** | **Balanced** | **Good** | **Standard production** |
| p6 | Slow | High | High-quality export |
| **p7** | **Slowest** | **Highest** | **Final master** |

### CQ (Constant Quality) Values

| CQ | Visual Quality | File Size | Recommended Use |
|----|---------------|-----------|-----------------|
| 15 | Near-lossless | Very Large | Archive masters |
| 18 | Excellent | Large | Final renders, YouTube 4K+ |
| **20** | **Very Good** | **Medium** | **Standard YouTube** |
| 23 | Good | Smaller | Previews, drafts |
| 26 | Acceptable | Small | Quick checks |
| 30 | Low | Very Small | Thumbnails only |

### YouTube Recommended Bitrates

| Resolution | SDR Bitrate | HDR Bitrate | Frame Rate |
|------------|-------------|-------------|------------|
| 1080p | 12-15 Mbps | 15-20 Mbps | 24-60 fps |
| 1440p | 24-30 Mbps | 30-40 Mbps | 24-60 fps |
| 4K | 35-45 Mbps | 44-56 Mbps | 24-60 fps |
| 8K | 80-120 Mbps | 100-150 Mbps | 24-60 fps |
| 8K 360 Stereo | 100-150 Mbps | 130-180 Mbps | 24-30 fps |

### Audio Settings

| Setting | Value | Notes |
|---------|-------|-------|
| Codec | AAC | Best compatibility |
| Sample Rate | 48000 Hz | YouTube standard |
| Bitrate | 384 kbps | High quality |
| Channels | Stereo | Standard |

---

## Common Flags Explained

| Flag | Purpose |
|------|---------|
| `-movflags +faststart` | Moves metadata to beginning for web streaming (CRITICAL) |
| `-tag:v hvc1` | HEVC compatibility tag for Apple devices |
| `-pix_fmt yuv420p` | Maximum compatibility pixel format |
| `-preset p5` | NVENC quality/speed balance |
| `-tune hq` | High quality tuning for NVENC |
| `-rc vbr` | Variable bitrate mode |
| `-cq N` | Constant quality target (lower = better) |
| `-b:v NM` | Target video bitrate |
| `-maxrate NM` | Maximum bitrate cap |
| `-bufsize NM` | Rate control buffer (2x maxrate recommended) |

---

## Troubleshooting

### NVENC Not Found

```bash
# Verify NVENC support
ffmpeg -encoders | grep nvenc

# If empty, install NVIDIA drivers and cuda-enabled FFmpeg
```

### Scaling Artifacts with NVENC

```bash
# Use CPU scaling before NVENC encode
ffmpeg -i input.mp4 \
  -vf "scale=3840:2160" \
  -c:v hevc_nvenc -preset p5 \
  -y output.mp4
```

### Color Space Issues

```bash
# Force sRGB color space for web
ffmpeg -i input.mp4 \
  -vf "colorspace=all=bt709:iall=bt601-6-625" \
  -c:v h264_nvenc \
  -y output.mp4
```

### Out of Memory on 8K

```bash
# Reduce GPU memory usage with 2-pass encoding
ffmpeg -i frames/%05d.png \
  -c:v hevc_nvenc -preset p5 \
  -2pass 1 -y /dev/null && \
ffmpeg -i frames/%05d.png \
  -c:v hevc_nvenc -preset p5 \
  -2pass 2 -y output_8k.mp4
```

---

## Sources

- [NVIDIA Video Codec SDK](https://developer.nvidia.com/video-codec-sdk)
- [FFmpeg NVENC Documentation](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.0/ffmpeg-with-nvidia-gpu/index.html)
- [YouTube Recommended Upload Settings](https://support.google.com/youtube/answer/1722171)
- [YouTube 360 Video Help](https://support.google.com/youtube/answer/6178631)
- [Google Spatial Media GitHub](https://github.com/google/spatial-media)
- [FFmpeg 360 Video Cheat Sheet](https://gist.github.com/nickkraakman/e351f3c917ab1991b7c9339e10578049)

---

*Last updated: 2026-01-28*
