"""Modal app stub for the Unity 360 render lane (SPIKE: builds, never run here).

Nothing in this file is executed by CI. Deploying or running it needs a Modal
account, a `unity-licence` Modal secret and a GPU spend decision, all of which
are Jonathan's. See docs/UNITY-OFF-BOX-SPIKE.md.

    modal run infra/unity-cloud/modal_app.py --audio-path /vol/in/a.wav --name demo
"""
import pathlib
import subprocess

import modal

HERE = pathlib.Path(__file__).parent
REPO_ROOT = HERE.parent.parent

app = modal.App("efs-unity-360")

image = (
    modal.Image.from_dockerfile(HERE / "Dockerfile", context_dir=HERE)
    .add_local_dir(REPO_ROOT / "unity", "/project", copy=True,
                   ignore=["Library/**", "Recordings/**", "Temp/**", "Logs/**"])
)

# Audio in, finished MP4 + frames out. Swap for an R2 CloudBucketMount if desired.
vol = modal.Volume.from_name("efs-unity-renders", create_if_missing=True)

# Secret key UNITY_LICENSE_B64 = base64 of Unity_lic.ulf (see the doc's manual steps).
licence = modal.Secret.from_name("unity-licence")


@app.function(
    image=image,
    gpu="L4",                 # unproven; compare T4 / A10 / L40S in the spike
    timeout=60 * 60 * 24,     # Modal's per-function ceiling
    secrets=[licence],
    volumes={"/vol": vol},
)
def render(audio_path: str, name: str, mode: str = "360stereo",
           res: int = 4096, fps: int = 30, preset: str = "") -> str:
    import base64
    import os

    lic = pathlib.Path("/tmp/Unity_lic.ulf")
    lic.write_bytes(base64.b64decode(os.environ["UNITY_LICENSE_B64"]))
    os.environ["UNITY_LICENSE_FILE"] = str(lic)

    out = f"/vol/out/{name}"
    cmd = ["/usr/local/bin/efs-unity-entrypoint", "--audio", audio_path,
           "--name", name, "--mode", mode, "--res", str(res), "--fps", str(fps),
           "--output", out, "--strict-vr-meta", "--strict-render-settings"]
    if preset:
        cmd += ["--preset", preset]
    subprocess.run(cmd, check=True)
    vol.commit()
    return f"{out}/{name}_vr.mp4"


@app.local_entrypoint()
def main(audio_path: str, name: str = "efs_cloud_spike"):
    print(render.remote(audio_path, name))
