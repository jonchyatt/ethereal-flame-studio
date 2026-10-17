#!/bin/bash
# Starts a virtual display, installs the Unity licence file, then runs unity/render.sh --headed.
# Usage: efs-unity-entrypoint --audio /in/a.wav --name x --output /out [render.sh flags]
set -euo pipefail

: "${UNITY_LICENSE_FILE:?path to Unity_lic.ulf (mounted secret) is required}"
[ -f "$UNITY_LICENSE_FILE" ] || { echo "ERROR: licence file missing: $UNITY_LICENSE_FILE"; exit 1; }

mkdir -p "$HOME/.local/share/unity3d/Unity"
cp "$UNITY_LICENSE_FILE" "$HOME/.local/share/unity3d/Unity/Unity_lic.ulf"

# Software-GL fallback display. A real GPU context may need an NVIDIA Xorg
# instead; see "Virtual display" in the spike doc.
Xvfb "$DISPLAY" -screen 0 1920x1080x24 +extension GLX +render -noreset &
XVFB_PID=$!
trap 'kill $XVFB_PID 2>/dev/null || true; rm -f "$HOME/.local/share/unity3d/Unity/Unity_lic.ulf"' EXIT
for _ in $(seq 1 20); do xdpyinfo -display "$DISPLAY" >/dev/null 2>&1 && break; sleep 0.5; done

# Fail early and loudly if no GPU context exists (never render on llvmpipe).
if ! glxinfo -B 2>/dev/null | grep -qi nvidia; then
  echo "ERROR: GL renderer is not an NVIDIA GPU:"; glxinfo -B 2>&1 | head -20
  exit 3
fi

export UNITY_PATH="${UNITY_PATH:-/opt/unity/Editor/Unity}"
exec /project/render.sh --headed "$@"
