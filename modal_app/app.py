"""
Ethereal Flame Studio - Modal Cloud Rendering App

Provides CPU and GPU render functions plus /submit and /status web endpoints.
Renders are executed in containers with Node.js, Chromium, and FFmpeg pre-installed.
Output videos are written to a Cloudflare R2 mount and results are sent back
via a PATCH callback to the Vercel API.
"""

import modal
import json
import os
import subprocess
import time
import shutil
import requests
from pathlib import Path

app = modal.App("ethereal-flame-studio")

# ---------------------------------------------------------------------------
# Container images
# ---------------------------------------------------------------------------

_common_commands = [
    # Node.js 20 LTS
    "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
    "apt-get install -y nodejs",
    # Chromium + deps for Puppeteer
    "apt-get install -y chromium fonts-liberation libappindicator3-1 libasound2 "
    "libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 "
    "libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 "
    "xdg-utils libgbm1 libpango-1.0-0 libcairo2",
    # FFmpeg
    "apt-get install -y ffmpeg",
]

# Project files are copied and built once during image creation
_project_setup = [
    "cd /app && npm ci --production=false",
    "cd /app && npm run build",
]

# Lightweight image for web endpoints (submit/status) — fast cold start
web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]", "requests")
)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl", "git", "ca-certificates", "gnupg")
    .run_commands(*_common_commands)
    .pip_install("fastapi[standard]")
    .add_local_dir(".", "/app", copy=True, ignore=[
        "node_modules", ".next", ".git", "modal_app/__pycache__",
        "test-*", "e2e-results", "temp-backup", "Holding",
    ])
    .run_commands(*_project_setup)
    .env({
        "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/chromium",
        "NODE_ENV": "production",
    })
)

gpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl", "git", "ca-certificates", "gnupg")
    .run_commands(*_common_commands)
    .pip_install("fastapi[standard]")
    .add_local_dir(".", "/app", copy=True, ignore=[
        "node_modules", ".next", ".git", "modal_app/__pycache__",
        "test-*", "e2e-results", "temp-backup", "Holding",
    ])
    .run_commands(*_project_setup)
    .env({
        "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/chromium",
        "NODE_ENV": "production",
        "MODAL_GPU": "1",
    })
)

# ---------------------------------------------------------------------------
# R2 storage mount
# ---------------------------------------------------------------------------

r2_mount = modal.CloudBucketMount(
    bucket_name="ethereal-renders",
    secret=modal.Secret.from_name("r2-credentials"),
    bucket_endpoint_url=os.environ.get(
        "R2_ENDPOINT", "https://4bdc66621e4f9e21d1601f0c9dd72740.r2.cloudflarestorage.com"
    ),
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _prepare_audio(audio_url: str | None, audio_base64: str | None, job_id: str) -> str:
    """Download or decode audio to a local temp file. Returns path."""
    import base64

    audio_dir = Path("/tmp/audio")
    audio_dir.mkdir(parents=True, exist_ok=True)

    if audio_url:
        ext = Path(audio_url).suffix or ".mp3"
        dest = audio_dir / f"{job_id}{ext}"
        print(f"[modal] Downloading audio from {audio_url}")
        resp = requests.get(audio_url, timeout=120)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        return str(dest)

    if audio_base64:
        dest = audio_dir / f"{job_id}.mp3"
        print(f"[modal] Decoding base64 audio ({len(audio_base64)} chars)")
        dest.write_bytes(base64.b64decode(audio_base64))
        return str(dest)

    raise ValueError("Either audio_url or audio_base64 must be provided")


def _start_next_server() -> subprocess.Popen:
    """Start `next start` and wait until port 3000 is ready."""
    print("[modal] Starting Next.js production server...")
    proc = subprocess.Popen(
        ["npx", "next", "start", "-p", "3000"],
        cwd="/app",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    # Poll until port 3000 responds
    import urllib.request
    for attempt in range(60):
        time.sleep(1)
        try:
            urllib.request.urlopen("http://localhost:3000", timeout=2)
            print(f"[modal] Next.js ready after {attempt + 1}s")
            return proc
        except Exception:
            pass

    proc.kill()
    raise RuntimeError("Next.js failed to start within 60s")


def _run_render(config: dict, audio_path: str, job_id: str, callback_url: str | None) -> dict:
    """Execute the render entry script and return result info."""
    # Write config to disk
    config_path = "/tmp/render-config.json"
    with open(config_path, "w") as f:
        json.dump(config, f)

    output_path = f"/tmp/output/{job_id}.mp4"
    os.makedirs("/tmp/output", exist_ok=True)

    # Build command
    cmd = [
        "npx", "tsx", "scripts/modal-render-entry.ts",
        "--config", config_path,
        "--audio", audio_path,
        "--output", output_path,
        "--app-url", "http://localhost:3000",
        "--job-id", job_id,
    ]
    if callback_url:
        cmd.extend(["--callback-url", callback_url])

    print(f"[modal] Running render: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd="/app", capture_output=True, text=True, timeout=3600)

    print(f"[modal] Render stdout:\n{result.stdout[-2000:]}")
    if result.stderr:
        print(f"[modal] Render stderr:\n{result.stderr[-2000:]}")

    if result.returncode != 0:
        raise RuntimeError(f"Render failed (exit {result.returncode}): {result.stderr[-500:]}")

    return {"output_path": output_path}


def _copy_to_r2(local_path: str, job_id: str) -> str:
    """Copy the rendered MP4 to R2 mount. Returns the R2 key."""
    r2_dir = Path("/r2/renders")
    r2_dir.mkdir(parents=True, exist_ok=True)
    r2_dest = r2_dir / f"{job_id}.mp4"
    shutil.copy2(local_path, str(r2_dest))
    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    print(f"[modal] Copied {size_mb:.1f} MB to R2: renders/{job_id}.mp4")
    return f"renders/{job_id}.mp4"


def _send_callback(callback_url: str, job_id: str, status: str,
                   r2_key: str | None = None, error: str | None = None,
                   progress: int | None = None):
    """PATCH the Vercel render API with job status updates."""
    if not callback_url:
        return

    body: dict = {}
    if status:
        body["status"] = status
    if progress is not None:
        body["progress"] = progress
    if error:
        body["errorMessage"] = error
    if r2_key:
        # Build a public R2 URL — assumes the bucket has a public custom domain
        # or Cloudflare Worker serving it. The URL pattern can be adjusted.
        r2_url = f"https://renders.etherealflame.studio/{r2_key}"
        body["output"] = {
            "format": "mp4",
            "localPath": r2_url,
            "fileSizeBytes": 0,
            "durationSeconds": 0,
            "resolution": {"width": 0, "height": 0},
            "encoding": {"codec": "h264", "bitrate": 0, "crf": 23, "preset": "balanced"},
            "gdriveUrl": None,
            "gdriveFileId": None,
            "renderStartedAt": "",
            "renderCompletedAt": "",
            "uploadedAt": None,
        }
    if status == "completed":
        body["currentStage"] = "Complete"
    elif status == "failed":
        body["currentStage"] = "Failed"

    url = f"{callback_url}/api/render/{job_id}"
    print(f"[modal] PATCH {url} → {json.dumps(body)[:200]}")
    try:
        auth_token = os.environ.get("MODAL_AUTH_TOKEN", "")
        resp = requests.patch(
            url,
            json=body,
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=10,
        )
        print(f"[modal] Callback response: {resp.status_code}")
    except Exception as e:
        print(f"[modal] Callback failed: {e}")


# ---------------------------------------------------------------------------
# Render functions
# ---------------------------------------------------------------------------

@app.function(
    image=cpu_image,
    secrets=[modal.Secret.from_name("r2-credentials"), modal.Secret.from_name("render-auth")],
    volumes={"/r2": r2_mount},
    timeout=3600,
    memory=4096,
    cpu=4.0,
)
def render_cpu(
    config: dict,
    job_id: str,
    audio_url: str | None = None,
    audio_base64: str | None = None,
    callback_url: str | None = None,
) -> dict:
    """Render a video on CPU (good for 1080p)."""
    server_proc = None
    try:
        _send_callback(callback_url, job_id, "rendering", progress=5)

        audio_path = _prepare_audio(audio_url, audio_base64, job_id)
        server_proc = _start_next_server()

        _send_callback(callback_url, job_id, "rendering", progress=10)

        result = _run_render(config, audio_path, job_id, callback_url)

        r2_key = _copy_to_r2(result["output_path"], job_id)

        _send_callback(callback_url, job_id, "completed", r2_key=r2_key, progress=100)

        return {"status": "completed", "r2_key": r2_key}

    except Exception as e:
        _send_callback(callback_url, job_id, "failed", error=str(e))
        raise
    finally:
        if server_proc:
            server_proc.kill()


@app.function(
    image=gpu_image,
    secrets=[modal.Secret.from_name("r2-credentials"), modal.Secret.from_name("render-auth")],
    volumes={"/r2": r2_mount},
    gpu="A10G",
    timeout=3600,
    memory=8192,
    cpu=4.0,
)
def render_gpu(
    config: dict,
    job_id: str,
    audio_url: str | None = None,
    audio_base64: str | None = None,
    callback_url: str | None = None,
) -> dict:
    """Render a video on GPU (for 4K and 360 formats)."""
    server_proc = None
    try:
        _send_callback(callback_url, job_id, "rendering", progress=5)

        audio_path = _prepare_audio(audio_url, audio_base64, job_id)
        server_proc = _start_next_server()

        _send_callback(callback_url, job_id, "rendering", progress=10)

        result = _run_render(config, audio_path, job_id, callback_url)

        r2_key = _copy_to_r2(result["output_path"], job_id)

        _send_callback(callback_url, job_id, "completed", r2_key=r2_key, progress=100)

        return {"status": "completed", "r2_key": r2_key}

    except Exception as e:
        _send_callback(callback_url, job_id, "failed", error=str(e))
        raise
    finally:
        if server_proc:
            server_proc.kill()


# ---------------------------------------------------------------------------
# Web endpoints
# ---------------------------------------------------------------------------

def _needs_gpu(config: dict) -> bool:
    """Determine if a render job should use GPU based on output format."""
    fmt = config.get("output", {}).get("format", "flat-1080p-landscape")
    return "4k" in fmt or "360" in fmt


@app.function(
    image=web_image,
    secrets=[modal.Secret.from_name("render-auth")],
)
@modal.concurrent(max_inputs=100)
@modal.fastapi_endpoint(method="POST", label="ethereal-submit")
def submit(request: dict) -> dict:
    """Accept a render job submission. Returns a call_id for status polling."""
    # Authenticate
    auth_token = os.environ.get("MODAL_AUTH_TOKEN", "")
    req_token = request.get("auth_token", "")
    if not auth_token or req_token != auth_token:
        return {"error": "Unauthorized", "status": 401}

    config = request.get("config", {})
    job_id = request.get("job_id", f"modal_{int(time.time())}")
    audio_url = request.get("audio_url")
    audio_base64 = request.get("audio_base64")
    callback_url = request.get("callback_url")

    if not config:
        return {"error": "config is required", "status": 400}
    if not audio_url and not audio_base64:
        return {"error": "audio_url or audio_base64 is required", "status": 400}

    use_gpu = request.get("gpu", _needs_gpu(config))

    # Dispatch asynchronously
    fn = render_gpu if use_gpu else render_cpu
    call = fn.spawn(
        config=config,
        job_id=job_id,
        audio_url=audio_url,
        audio_base64=audio_base64,
        callback_url=callback_url,
    )

    return {
        "call_id": call.object_id,
        "gpu": use_gpu,
        "job_id": job_id,
    }


@app.function(
    image=web_image,
    secrets=[modal.Secret.from_name("render-auth")],
)
@modal.concurrent(max_inputs=100)
@modal.fastapi_endpoint(method="GET", label="ethereal-status")
def status(call_id: str = "") -> dict:
    """Check the status of a previously submitted render job."""
    if not call_id:
        return {"error": "call_id query parameter required", "status": 400}

    try:
        fc = modal.functions.FunctionCall.from_id(call_id)
        try:
            result = fc.get(timeout=0)
            return {"status": "completed", "result": result}
        except TimeoutError:
            return {"status": "running"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}
    except Exception as e:
        return {"status": "unknown", "error": str(e)}
