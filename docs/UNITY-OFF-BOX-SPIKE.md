# Unity 360 render off-box spike

Date: 2026-10-17. Status: research and unrun stubs. Nothing here rented compute, created an account or touched a credential.

Question: can the Unity 360 lane (`unity/render.sh`: Path B PNG sequence, then ffmpeg, then spatialmedia) run on rented compute instead of Jonathan's PC?

## Verdict

**Conditional NO-GO today, GO for a one-afternoon proof once the licence question is answered.**

The compute part is routine. The blocker is the licence. Unity stopped supporting the manual activation-file flow for Personal licences (Unity forum thread, "Unity no longer supports manual activation of Personal licenses"), and the repo already records that `-batchmode` fails on Personal for the pinned 2021.2.8f1, so only `--headed` works. I could not verify from here what the current Personal route for a headless Linux machine is. Until Jonathan confirms a licence that activates on Linux (steps below), a rented box cannot render. If a Plus or Pro seat is an acceptable cost, the licence problem becomes a serial-number login and the rest of this doc applies unchanged.

Recommended path once licensed: a **GPU VM or pod (Lambda or RunPod)** for the first proof, because a real GL or Vulkan context is easiest there. Modal is the best fit for the finished lane (per-second billing, scales to zero) but is the one most likely to fail on graphics capability. Treat that as a test, not a fact.

## What the lane needs (from the repo)

- Editor 2021.2.8f1 (`unity/ProjectSettings/ProjectVersion.txt`), Recorder 3.0.3, driven by `AutoRecorder.BatchRender`.
- A real GPU render context. `-nographics` breaks the Recorder, and `-batchmode` fails Personal licensing on this version, so `render.sh --headed` is the only working mode. On a server that means a display must exist.
- ffmpeg, python3, and Google's spatialmedia for the 360 metadata (`--strict-vr-meta`).
- Measured speed on the home RTX 2060 (numbers in `AutoRecorder.cs` comments and `data/waia-mixer-spike/render-receipt.json`): about 0.17 s per frame at 2048x1024 (1920 frames in 318 s), about 12.7 s per frame at 8192x4096.
- `AutoRecorder` takes no frame-range argument (I listed its command-line arguments), so a long render cannot be split across machines without a code change in `unity/`, which this PR does not touch.

## Options compared

| Option | Fit | Why |
|---|---|---|
| Modal GPU container | Best ergonomics, highest graphics risk | Builds from a Dockerfile, per-second billing, Python-driven, scales to zero. Containers get the NVIDIA driver for compute; whether the graphics/GL libraries are exposed is unverified and is the first thing to test. 24 hour function ceiling. |
| GameCI `unityci/editor` image plus Xvfb | The image, not a host | This is the image used in `infra/unity-cloud/Dockerfile` (tag `ubuntu-2021.2.8f1-base-3` exists on Docker Hub; checked with `docker manifest inspect`). It still needs a GPU host to run on. Xvfb alone gives software GL only, which would silently render on the CPU. |
| RunPod pod | Good for the first proof | Container with a GPU, cheap community cards (RTX 4090 listed around $0.34/h, L4 around $0.44/h on one comparison site). Same graphics-capability question as Modal, but you can SSH in and fix it. |
| Lambda GPU VM | Safest for graphics | A full VM, so you can run Xorg on the NVIDIA driver with a dummy display. A10 listed around $0.86/h. Billed while the VM is up, so it must be torn down after each run. |
| Colab | No | No custom containers, so no pinned Editor image; no persistent place for a licence between sessions; sessions are short-lived and shared; terms aim at notebooks. |
| Kaggle | Possible in theory, fragile in practice | Answered in full in "Kaggle, in depth" below. Not the "no" the first draft implied: a notebook can hold a licence in Secrets and an editor in a private dataset. The real problems are root/apt, a graphics context, and quota. |
| Oracle Cloud free tier | No | ARM Ampere, no GPU, and Unity's Editor does not run on Linux Arm64. Paid A10 shapes work; see "Oracle Cloud" below. |

Prices come from third-party comparison pages (Modal: T4 ~$0.59/h, L4 ~$0.80/h, A10 ~$1.10/h, L40S ~$1.95/h; sources: spheron.network Modal pricing post, deploybase.ai RunPod vs Lambda) and drift often. Check each provider's own page before spending.

## Personal licence on headless Linux

What used to work (GameCI "activation" docs): run the editor with `-batchmode -createManualActivationFile`, upload the `.alf` at license.unity3d.com, download the `.ulf`, and place it at `~/.local/share/unity3d/Unity/Unity_lic.ulf` in the container.

What I found: Unity's forum states that manual activation of Personal licences is no longer supported, and points at an open GameCI issue (`game-ci/unity-test-runner#235`) rather than a replacement. So the `.ulf` flow in the stubs is the **mechanism** (the file lands in that path, the entrypoint copies it in and deletes it on exit), but whether Unity will issue a Personal `.ulf` today is **unverified**. Jonathan must try step 2 below on a throwaway Linux box or WSL, with his own account, before any money is spent. If it fails, options are a Plus or Pro serial (login with `-serial` in batchmode, no display licence quirk on newer editors) or staying on the home PC.

Also check Unity's terms for running Personal on rented machines and for revenue limits; that is Jonathan's call, not something I can settle.

## Virtual display and GPU

- A GPU is required: software GL (llvmpipe, what plain Xvfb gives) would render 8K frames at a crawl and could differ from the verified look. The entrypoint refuses to start unless `glxinfo` reports an NVIDIA renderer.
- On Lambda or any VM: install the NVIDIA driver, run Xorg with a headless config (`Option "AllowEmptyInitialConfiguration" "true"`), point `DISPLAY` at it. This is the known-good pattern for GL on a server.
- On Modal or RunPod: set `NVIDIA_DRIVER_CAPABILITIES=compute,utility,graphics,display` (done in the Dockerfile), then check `glxinfo -B`. If the platform does not expose the graphics libraries, try Unity `-force-vulkan` under Xvfb, and if that fails move to a VM. Unproven either way.

## Cost

Frame counts: 28.4 s at 30 fps is 852 frames. 10 minutes at 30 fps is 18,000 frames. Cost = frames x seconds per frame / 3600 x hourly rate. Speeds on rented cards are **unmeasured**; I bracket them at 1x (same as the home 2060) and 2x for an L4 or A10. A 4090 is probably faster still; I show it at 3x to 4x as a guess.

| Render | Home-GPU time | L4 on Modal ($0.80/h) | 4090 on RunPod ($0.34/h, guess) |
|---|---|---|---|
| 28 s, 2048x1024 (measured 0.17 s/frame) | about 2.5 min plus Editor start | under $0.10 | under $0.05 |
| 28 s, 8192x4096 (measured 12.7 s/frame) | about 3.0 h | about $1.20 to $2.40 | about $0.30 to $0.80 |
| 10 min, 8192x4096 | about 63 h | about $25 to $51 | about $5 to $7 |

Hidden costs for the 10 minute 8K case: Modal's 24 hour ceiling is below 63 h at 1x, so it needs chunking (not possible without a frame-range change); 18,000 PNGs at 8K is likely hundreds of GB to over 1 TB of scratch (size per frame not measured); upload to R2 afterwards. Lambda bills while the VM is up, including Editor start, so add idle time. Note the existing safety timeout in `AutoRecorder` scales per frame and is fine for these runs.

## Kaggle, in depth

Question: can a Kaggle notebook download the Linux editor, activate a Personal `.ulf`, run Xvfb, render Path B and push the mp4 out before the session ends?

Facts I could confirm (aimultiple.com free-GPU comparison): one P100 or two T4 (16 GB each), about 30 GPU hours a week, 12 hour session cap, 20 GB saved working directory, phone verification needed for accelerators, queueing at busy times. From Kaggle's own docs I could only read page metadata, so the following is from general knowledge and **unverified**: internet access is off by default and switched on per notebook; Secrets live under Add-ons and read through `UserSecretsClient`; input datasets mount read-only at `/kaggle/input`; `apt-get` is typically restricted; `kaggle kernels push/status/output` can start a run and fetch output from outside.

Verdict: **it might work for small clips, but I would not build on it.** The decisive unknowns, in order:

1. Root and `apt`. Xvfb, libglu, vulkan and the Editor's own library dependencies (libgconf, libnss, libgtk) need to be installed. If `apt-get` is blocked, you must vendor the .deb files into a dataset and `dpkg -x` them into a prefix, a brittle step that breaks on any library the Editor loads that is not vendored.
2. A graphics context. Kaggle's GPU image is built for compute; whether NVIDIA's GL/Vulkan user-space libraries are present is unknown. Without them Xvfb gives llvmpipe (CPU), and the entrypoint's NVIDIA check would correctly refuse to render.
3. Licence. Same blocker as everywhere: a Personal `.ulf` may not be issuable (see above). On Kaggle it would sit in Secrets and be written to `~/.local/share/unity3d/Unity/Unity_lic.ulf` at start. Whether Unity's licence service tolerates a new host per session is untested.
4. Quota. About 30 GPU hours a week. At the measured 0.17 s/frame (2048 wide) a 28 s clip is minutes; a 28 s 8K render is about 3 h at 1x; a 10 minute 8K render (~63 h at 1x) cannot finish within a 12 hour session or even a week's quota, and there is no frame-range argument to chunk it.
5. Terms. Free Kaggle compute is offered for data science and ML; running a render pipeline there may breach them. Jonathan should read them before relying on it.

Per-run setup time (estimates, not measured): copy and unpack the Editor from a dataset to local disk 2 to 5 minutes (Editor is several GB; the 20 GB working directory is tight, so unpack to a scratch path outside it if one is writable); apt or dpkg step 1 to 3 minutes; first project open with no cached `Library/` 5 to 15 minutes (cache `Library/` as a second dataset to cut this to about 1 to 2 minutes); the render itself; ffmpeg and spatialmedia a minute or two; upload. Plan on 10 to 25 minutes of overhead per run.

Where to cache: two **private Kaggle datasets**: (a) the extracted Editor 2021.2.8f1 plus the .deb files, (b) the project `Library/` folder. Read-only mount, so copy to scratch before running. The `.ulf` goes in Secrets, never in a dataset (datasets can be copied by whoever you share with, and this repo and its PRs are public).

Getting the video out: write to `/kaggle/working` (20 GB: fine for one 28 s MP4, not for PNG frames, so delete frames after the encode and keep only the MP4), or `rclone copy` to R2 with R2 keys held in Secrets. Do the upload as the last cell and keep a time guard well under 12 hours so a late failure cannot lose the file.

Failure points, ranked by likelihood: apt blocked; no NVIDIA GL so the entrypoint refuses; Unity licence refused on the new host; project reimport blowing the time budget; quota exhausted mid-run; session killed during upload.

## Oracle Cloud

Free tier: Ampere A1 (ARM) with **no GPU**. Unity's own Hub page says the Editor does not support Linux on Arm64: the Hub installs on an Arm64 device but cannot download or run an Editor there (docs.unity.com, "Install the Unity Hub on Linux"). So the always-free tier **cannot run the Editor at all**, and also has no GPU to render with. It is still useful for non-render glue (the job trigger, ffmpeg, uploading), nothing more.

Paid GPU shapes: the A10 shapes (`VM.GPU.A10.1`, `.2`) list at about $2.00 per GPU-hour pay-as-you-go (Oracle's A10 graphics-rendering blog; computeprices.com shows the same $2.00 for A10, $3.50 for L40S, $4.00 for A100 SXM, updated 2026-10-16). Against Modal's A10 at about $1.10/h and L4 at about $0.80/h, Oracle is roughly 1.8x to 2.5x more per hour for similar silicon, and it is a VM you must start and stop. Oracle's A10 blog proves GPU rendering (Blender with OptiX) on these shapes but does not cover X or GL setup, so the graphics context question remains a test. Using paid shapes needs a paid account and often a service-limit request for GPU quota. Cost for the same jobs at $2.00/h and 1x to 2x speed: 28 s 8K about $3 to $6; 10 minute 8K about $63 to $127 (Modal L4 row above: $25 to $51).

## Ranking: a template that "kicks on and kicks out the video"

Scored on: one command starts and stops it, billing stops by itself, licence and editor persist, GPU graphics likely to work, cost.

1. **Modal**: best template. One `modal run`, scales to zero, secret store for the licence, output to a volume or R2. Risk: GL/Vulkan exposure and the 24 h cap. First to test.
2. **RunPod pod via its API**: cheapest GPU per hour, container-based, SSH to debug the display. Needs a small start/stop wrapper and a persistent network volume for the Editor and Library cache.
3. **Lambda VM**: most likely to give a clean Xorg plus NVIDIA GL, so the safest to make work, but billed while up, so the template needs a teardown that runs even on failure.
4. **Oracle paid A10 VM**: same shape of solution as Lambda at about double the price plus quota paperwork. Only worth it if Jonathan has Oracle credits.
5. **Kaggle**: free and scriptable through its CLI, but apt, graphics, terms and quota are all open; use it only to experiment with short 2048-wide clips.
6. **Colab**: no.
Not an option: **Oracle always-free ARM** (Editor unsupported, no GPU).

If the goal is genuinely zero-touch for the weekly slate, the answer is 1 or 2 for 28 s to 2 minute clips, and a decision to keep the 10 minute 8K renders on the home GPU (or add a frame-range argument in `unity/` first so they can be split across several runs).

## How this maps to `cloud | home | local-agent`

`src/app/api/render/route.ts` accepts `metadata.renderTarget` of `cloud`, `home` or `local-agent` (default `cloud`); `PRODUCT.md` says engine (`puppeteer | unity`) and target are independent fields (HB-7). Proposed mapping, no schema change:

- `home`: Jonathan's PC, the lane that works today.
- `local-agent`: the polling agent on a machine Jonathan controls; an always-on rented GPU VM that runs the agent would fit here with zero new code.
- `cloud` with engine `unity`: an on-demand worker (the Modal app) that claims the job, renders and uploads. This is the one new executor, and it should reuse the local-agent job claim and upload endpoints rather than add a fourth pipeline (HB-2). I did not read those routes in depth; confirm before building.

Rendering stays outside this repo's Vercel deploy and publishing is untouched (HB-3, HB-5).

## One-time manual steps for Jonathan

1. Decide the licence route. If staying on Personal, do step 2; if buying Plus or Pro, skip to 3 and use a serial instead of a `.ulf`.
2. On a Linux machine or WSL with the Unity Hub or Editor 2021.2.8f1: run `Unity -batchmode -nographics -createManualActivationFile -logFile -`, upload the resulting `Unity_v2021.2.8f1.alf` at license.unity3d.com/manual, and download the `.ulf`. If the page says manual activation is no longer available, stop; the answer is no-go on Personal and the rest waits on a different licence.
3. Base64 the file: `base64 -w0 Unity_lic.ulf`. Never commit it; the repo is public.
4. Create a Modal account and a secret named `unity-licence` with one key, `UNITY_LICENSE_B64`, set to that string. (For RunPod or Lambda, keep the file on the box's disk only for the run.)
5. Do not deploy anything yet. Tell me to run the smoke test: `modal run infra/unity-cloud/modal_app.py --audio-path <28 s wav> --name smoke` with a 2048-wide render first, then compare against the home receipt.

Stop conditions for the smoke test: no NVIDIA GL renderer, licence rejected, or frame output differs from the home render.

## Files in this PR

- `infra/unity-cloud/Dockerfile`: GameCI editor image plus Xvfb, Vulkan/GL tools, ffmpeg, spatialmedia. Not built: this sandbox has the Docker client but no daemon. Only the base tag was checked.
- `infra/unity-cloud/entrypoint.sh`: installs the licence file, starts the display, refuses non-GPU rendering, runs `render.sh --headed`.
- `infra/unity-cloud/modal_app.py`: Modal function stub. Syntax-checked only; Modal's SDK is not installed here, so API names such as `from_dockerfile` and `add_local_dir` were written from memory and need checking against Modal's current docs.

## Not verified

The Personal licence route, any rented-card render speed, graphics-driver exposure on Modal and RunPod, current prices, per-frame PNG size, and whether the Dockerfile builds end to end.
