#!/usr/bin/env python3
"""
Bake a per-output-frame 8-band spectrum table from an audio file.

Fixes the Argus-caught reactivity-sync bug: under frame-locked capture,
AudioListener.GetSpectrumData reads live (wall-clock) audio, which finishes
playing back in real time long before all output frames are captured — so
orb-size/water reactivity freezes ~78% of the way through the render.

This script computes, for each OUTPUT frame N (0..frames-1), the same
band-energy breakdown AudioAnalyzer.cs would read via GetSpectrumData if it
were sampling the video's own timeline (t = N/fps) instead of the real-time
DSP clock. Unity loads the resulting JSON table and drives the reactive
components from it during batch/headed recording.

Band edges mirror AudioAnalyzer.cs BAND_FREQ_MIN/MAX (ISO octave bands).

Usage:
    python3 bake_spectrum.py --audio in.mp3 --fps 30 --frames 852 \
        --bands 8 --spectrum-size 1024 --out spectrum.json
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

BAND_FREQ_MIN = [20.0, 60.0, 250.0, 500.0, 2000.0, 4000.0, 6000.0, 12000.0]
BAND_FREQ_MAX = [60.0, 250.0, 500.0, 2000.0, 4000.0, 6000.0, 12000.0, 20000.0]


def decode_audio_mono(path, sample_rate):
    """Decode any ffmpeg-readable audio file to mono float32 PCM via a temp raw file."""
    fd, raw_path = tempfile.mkstemp(suffix=".f32le")
    os.close(fd)
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", path,
                "-f", "f32le", "-ac", "1", "-ar", str(sample_rate),
                raw_path,
            ],
            check=True,
        )
        samples = np.fromfile(raw_path, dtype="<f4")
    finally:
        os.remove(raw_path)
    return samples


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--fps", type=float, required=True)
    ap.add_argument("--frames", type=int, required=True)
    ap.add_argument("--bands", type=int, default=8)
    ap.add_argument("--spectrum-size", type=int, default=1024,
                     help="Bin count, mirrors AudioAnalyzer.spectrumSize")
    ap.add_argument("--sample-rate", type=int, default=44100)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    if args.bands > 8:
        print(f"ERROR: only {len(BAND_FREQ_MIN)} ISO bands defined, got --bands {args.bands}", file=sys.stderr)
        sys.exit(1)

    sr = args.sample_rate
    samples = decode_audio_mono(args.audio, sr)

    n_fft = args.spectrum_size * 2  # rfft(n_fft) -> n_fft/2+1 bins, trimmed to spectrum_size
    window = np.blackman(n_fft).astype(np.float32)
    freq_per_bin = (sr / 2.0) / args.spectrum_size

    band_min = BAND_FREQ_MIN[: args.bands]
    band_max = BAND_FREQ_MAX[: args.bands]
    bin_ranges = []
    for lo, hi in zip(band_min, band_max):
        bin_lo = max(1, int(np.floor(lo / freq_per_bin)))
        bin_hi = min(args.spectrum_size - 1, int(np.ceil(hi / freq_per_bin)))
        bin_ranges.append((bin_lo, bin_hi))

    flat_data = []
    for i in range(args.frames):
        t = i / args.fps
        end_sample = int(round(t * sr))
        start_sample = end_sample - n_fft

        chunk = np.zeros(n_fft, dtype=np.float32)
        if end_sample > 0:
            src_start = max(0, start_sample)
            src = samples[src_start:end_sample]
            if len(src) > 0:
                chunk[-len(src):] = src

        spectrum = np.abs(np.fft.rfft(chunk * window))[: args.spectrum_size]

        for bin_lo, bin_hi in bin_ranges:
            seg = spectrum[bin_lo:bin_hi + 1]
            rms = float(np.sqrt(np.mean(seg ** 2))) if seg.size > 0 else 0.0
            # Normalize into the same tiny raw range (~1e-4..1e-2) Unity's
            # GetSpectrumData produces, so AudioAnalyzer's existing
            # sensitivity/bandSensitivity gains apply unchanged.
            flat_data.append(rms / n_fft)

    payload = {
        "fps": args.fps,
        "frames": args.frames,
        "bands": args.bands,
        "data": flat_data,
    }
    with open(args.out, "w") as f:
        json.dump(payload, f)

    print(f"[bake_spectrum] wrote {args.frames} frames x {args.bands} bands -> {args.out}")


if __name__ == "__main__":
    main()
