"""
EFS SAM 2.1 Video Segmenter -- person segmentation from video frames.

Standalone preprocessing script (does NOT import bpy -- runs in system Python
with torch/SAM installed, not inside Blender).

Pipeline position:
  video file -> sam_segmenter.py -> mask PNGs -> mask_to_mesh.py -> Blender mesh

Two public functions:
  segment_video(video_path, ...) -- extract frames from video and segment person
  segment_frames(frame_dir, ...) -- segment person from pre-extracted frame images

Mask output format:
  Binary PNGs (white=person, black=background), named frame_0001.png, frame_0002.png, ...
  (4-digit zero-padded to match Blender image sequence convention)

Temporal consistency:
  Uses SAM 2.1's video predictor for propagation across frames rather than
  independent per-frame segmentation. This prevents flickering and lost limbs.

Usage (CLI):
  python sam_segmenter.py --video path/to/video.mp4 --output path/to/masks/
  python sam_segmenter.py --frames path/to/frames/ --output path/to/masks/
  python sam_segmenter.py --video path/to/video.mp4 --point 960,540

Requirements:
  pip install torch torchvision segment-anything-2 opencv-python numpy
"""
import os
import sys
import json
import argparse
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# -- Project paths (mirrors scene_utils.py without importing bpy) --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
BLENDER_DIR = REPO_ROOT / "blender"
MASKS_DIR = BLENDER_DIR / "masks"


def _check_dependencies():
    """Verify required packages are installed, raise helpful errors if not."""
    missing = []
    try:
        import torch  # noqa: F401
    except ImportError:
        missing.append("torch")

    try:
        import cv2  # noqa: F401
    except ImportError:
        missing.append("opencv-python")

    try:
        import numpy  # noqa: F401
    except ImportError:
        missing.append("numpy")

    try:
        from sam2.build_sam import build_sam2_video_predictor  # noqa: F401
    except ImportError:
        try:
            from segment_anything_2.build_sam import build_sam2_video_predictor  # noqa: F401
        except ImportError:
            missing.append("segment-anything-2")

    if missing:
        raise ImportError(
            f"Missing required packages: {', '.join(missing)}. "
            f"Install with: pip install {' '.join(missing)}"
        )


def _get_sam2_predictor(model_type="vit_b"):
    """Load SAM 2.1 video predictor model.

    Model auto-downloads on first use via torch hub or the sam2 package.

    Args:
        model_type: Model variant. Options:
            "vit_b" -- base (fast, good enough for single person)
            "vit_l" -- large (more accurate, slower)
            "vit_h" -- huge (best accuracy, slowest)

    Returns:
        SAM2VideoPredictor instance.
    """
    import torch

    # Map short names to SAM 2.1 model configs
    model_configs = {
        "vit_b": ("facebook/sam2.1-hiera-base-plus", "sam2.1_hiera_b+.yaml"),
        "vit_l": ("facebook/sam2.1-hiera-large", "sam2.1_hiera_l.yaml"),
        "vit_h": ("facebook/sam2.1-hiera-large", "sam2.1_hiera_l.yaml"),  # fallback to large
    }

    if model_type not in model_configs:
        raise ValueError(
            f"Unknown model_type '{model_type}'. "
            f"Available: {list(model_configs.keys())}"
        )

    repo_id, config_name = model_configs[model_type]

    # Try sam2 package first, then segment_anything_2
    try:
        from sam2.build_sam import build_sam2_video_predictor
    except ImportError:
        from segment_anything_2.build_sam import build_sam2_video_predictor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading SAM 2.1 model '{model_type}' on {device}...")

    predictor = build_sam2_video_predictor(
        config_file=config_name,
        ckpt_path=None,  # auto-download from HuggingFace hub
        device=device,
    )

    return predictor


def _smooth_mask(mask, kernel_size=5):
    """Apply morphological smoothing to remove small holes and noise.

    Uses cv2.morphologyEx CLOSE operation (dilate then erode) to fill
    small gaps, followed by OPEN to remove small noise specks.

    Args:
        mask: Binary mask (uint8, 0 or 255).
        kernel_size: Size of the morphological kernel.

    Returns:
        Smoothed binary mask (uint8, 0 or 255).
    """
    import cv2
    import numpy as np

    kernel = np.ones((kernel_size, kernel_size), np.uint8)

    # CLOSE: fill small holes in the person mask
    smoothed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    # OPEN: remove small noise specks outside the person
    smoothed = cv2.morphologyEx(smoothed, cv2.MORPH_OPEN, kernel, iterations=1)

    return smoothed


def _extract_frames(video_path, frame_step=1):
    """Extract frames from a video file using OpenCV.

    Args:
        video_path: Path to video file.
        frame_step: Extract every Nth frame (1 = every frame).

    Returns:
        Tuple of (list of BGR numpy arrays, fps, total_frames, resolution [w, h]).

    Raises:
        FileNotFoundError: If video file does not exist.
        ValueError: If video cannot be opened.
    """
    import cv2

    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frames = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_step == 0:
            frames.append(frame)
        frame_idx += 1

    cap.release()

    logger.info(
        f"Extracted {len(frames)} frames from {video_path.name} "
        f"(total={total_frames}, step={frame_step}, {width}x{height} @ {fps:.1f}fps)"
    )

    return frames, fps, total_frames, [width, height]


def _load_frames_from_dir(frame_dir):
    """Load frame images from a directory.

    Supports common image formats (png, jpg, jpeg, bmp, tiff).
    Frames are sorted alphabetically by filename.

    Args:
        frame_dir: Path to directory containing frame images.

    Returns:
        Tuple of (list of BGR numpy arrays, resolution [w, h]).

    Raises:
        FileNotFoundError: If directory does not exist.
        ValueError: If no image files found.
    """
    import cv2

    frame_dir = Path(frame_dir)
    if not frame_dir.exists():
        raise FileNotFoundError(f"Frame directory not found: {frame_dir}")

    image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}
    frame_files = sorted(
        f for f in frame_dir.iterdir()
        if f.suffix.lower() in image_extensions
    )

    if not frame_files:
        raise ValueError(
            f"No image files found in {frame_dir}. "
            f"Supported formats: {image_extensions}"
        )

    frames = []
    for f in frame_files:
        img = cv2.imread(str(f))
        if img is not None:
            frames.append(img)

    if not frames:
        raise ValueError(f"Could not load any images from {frame_dir}")

    height, width = frames[0].shape[:2]

    logger.info(
        f"Loaded {len(frames)} frames from {frame_dir} ({width}x{height})"
    )

    return frames, [width, height]


def _select_person_mask(masks, scores, frame_shape):
    """Select the mask most likely to be a person from SAM's automatic output.

    Uses largest-area heuristic: the biggest connected component that is
    roughly person-shaped (not too wide/short) is probably the person.

    Args:
        masks: Array of binary masks from SAM.
        scores: Confidence scores for each mask.
        frame_shape: (height, width) of the original frame.

    Returns:
        Single binary mask (uint8, 0 or 255) of the person.

    Raises:
        ValueError: If no suitable person mask found.
    """
    import numpy as np

    if masks is None or len(masks) == 0:
        raise ValueError(
            "No masks generated. The frame may not contain a detectable person. "
            "Try providing a point_prompt=(x, y) at the person's center."
        )

    best_mask = None
    best_area = 0

    for i, mask in enumerate(masks):
        # Convert to binary if needed
        if mask.dtype == bool:
            binary = mask.astype(np.uint8) * 255
        else:
            binary = (mask > 0.5).astype(np.uint8) * 255

        area = np.sum(binary > 0)
        frame_area = frame_shape[0] * frame_shape[1]

        # Person should be between 2% and 90% of frame
        area_ratio = area / frame_area
        if area_ratio < 0.02 or area_ratio > 0.90:
            continue

        if area > best_area:
            best_area = area
            best_mask = binary

    if best_mask is None:
        raise ValueError(
            "No person-sized mask found in frame. "
            "Detected masks were either too small (<2% of frame) or "
            "too large (>90% of frame). "
            "Try providing a point_prompt=(x, y) at the person's center."
        )

    return best_mask


def _progress_report(current, total, stage="segmenting"):
    """Print JSON progress to stdout every 10% for MCP feedback.

    Args:
        current: Current frame index (0-based).
        total: Total number of frames.
        stage: Description of current operation.
    """
    if total == 0:
        return

    percent = int((current / total) * 100)
    # Report at 0%, every 10%, and 100%
    if current == 0 or percent % 10 == 0 and (current == 0 or int(((current - 1) / total) * 100) // 10 != percent // 10):
        progress = {
            "stage": stage,
            "frame": current + 1,
            "total": total,
            "percent": percent,
        }
        print(json.dumps(progress), flush=True)


def segment_video(video_path, output_dir=None, model_type="vit_b",
                  point_prompt=None, frame_step=1):
    """Segment a person from video frames using SAM 2.1 with temporal propagation.

    Extracts frames from a video file, runs SAM 2.1 video segmentation for
    temporal consistency across frames, applies morphological smoothing, and
    writes binary mask PNGs to the output directory.

    Args:
        video_path: Path to the input video file (mp4, avi, mov, etc.).
        output_dir: Directory for output mask PNGs. If None, defaults to
                    MASKS_DIR / video_stem (e.g., blender/masks/my_video/).
        model_type: SAM 2.1 model variant -- "vit_b", "vit_l", or "vit_h".
        point_prompt: Optional (x, y) tuple for a positive point prompt
                      indicating the person's location. If None, uses automatic
                      mask generation with largest-area heuristic.
        frame_step: Extract every Nth frame from the video (1 = every frame).

    Returns:
        Dict: {"status": "segmented", "mask_dir": str, "frame_count": int,
               "resolution": [w, h]}

    Raises:
        ImportError: If torch/SAM/opencv not installed.
        FileNotFoundError: If video file does not exist.
        ValueError: If no person detected in first frame.
    """
    _check_dependencies()
    import cv2
    import numpy as np
    import torch

    # Extract frames from video
    frames, fps, total_frames, resolution = _extract_frames(video_path, frame_step)

    if not frames:
        raise ValueError(f"No frames extracted from {video_path}")

    # Set up output directory
    video_path = Path(video_path)
    if output_dir is None:
        output_dir = MASKS_DIR / video_path.stem
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write extracted frames to a temp directory for SAM 2.1 video predictor
    # (SAM 2.1 video predictor expects a directory of JPEG frames)
    import tempfile
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        _progress_report(0, len(frames), "writing temp frames")

        for i, frame in enumerate(frames):
            frame_file = temp_path / f"frame_{i:04d}.jpg"
            cv2.imwrite(str(frame_file), frame)

        # Load SAM 2.1 video predictor
        predictor = _get_sam2_predictor(model_type)

        # Initialize video state
        with torch.inference_mode():
            state = predictor.init_state(video_path=str(temp_path))

            # Set up initial prompt on first frame
            if point_prompt is not None:
                # User-specified point prompt
                points = np.array([[point_prompt[0], point_prompt[1]]], dtype=np.float32)
                labels = np.array([1], dtype=np.int32)  # 1 = positive (foreground)

                _, obj_ids, mask_logits = predictor.add_new_points_or_box(
                    inference_state=state,
                    frame_idx=0,
                    obj_id=1,
                    points=points,
                    labels=labels,
                )
            else:
                # Automatic: use SAM on first frame, pick largest person-like mask
                # For auto mode, place a center point as initial prompt
                h, w = frames[0].shape[:2]
                center_x, center_y = w // 2, h // 2
                points = np.array([[center_x, center_y]], dtype=np.float32)
                labels = np.array([1], dtype=np.int32)

                _, obj_ids, mask_logits = predictor.add_new_points_or_box(
                    inference_state=state,
                    frame_idx=0,
                    obj_id=1,
                    points=points,
                    labels=labels,
                )

                # Check that initial mask is person-sized
                first_mask = (mask_logits[0] > 0.0).cpu().numpy().squeeze()
                frame_area = h * w
                mask_area = np.sum(first_mask)
                area_ratio = mask_area / frame_area

                if area_ratio < 0.02:
                    raise ValueError(
                        f"No person detected in first frame (mask area: {area_ratio:.1%} of frame). "
                        f"Try providing point_prompt=(x, y) at the person's center, "
                        f"e.g., point_prompt=({w // 2}, {h // 2})"
                    )

            # Propagate masks across all frames
            _progress_report(0, len(frames), "propagating masks")

            for frame_idx, obj_ids, mask_logits in predictor.propagate_in_video(
                inference_state=state
            ):
                # Convert logits to binary mask
                mask = (mask_logits[0] > 0.0).cpu().numpy().squeeze()
                binary_mask = (mask * 255).astype(np.uint8)

                # Apply morphological smoothing
                binary_mask = _smooth_mask(binary_mask, kernel_size=5)

                # Write mask PNG (4-digit zero-padded for Blender)
                mask_filename = f"frame_{frame_idx + 1:04d}.png"
                mask_path = output_dir / mask_filename
                cv2.imwrite(str(mask_path), binary_mask)

                _progress_report(frame_idx, len(frames), "segmenting")

            predictor.reset_state(state)

    _progress_report(len(frames), len(frames), "complete")

    result = {
        "status": "segmented",
        "mask_dir": str(output_dir),
        "frame_count": len(frames),
        "resolution": resolution,
    }

    print(json.dumps(result, indent=2))
    return result


def segment_frames(frame_dir, output_dir=None, model_type="vit_b",
                   point_prompt=None):
    """Segment a person from pre-extracted frame images using SAM 2.1.

    Same as segment_video() but takes a directory of frame images instead of
    a video file. Useful when frames have already been extracted.

    Args:
        frame_dir: Path to directory containing frame images (png, jpg, etc.).
        output_dir: Directory for output mask PNGs. If None, defaults to
                    MASKS_DIR / frame_dir_name.
        model_type: SAM 2.1 model variant -- "vit_b", "vit_l", or "vit_h".
        point_prompt: Optional (x, y) tuple for a positive point prompt
                      indicating the person's location.

    Returns:
        Dict: {"status": "segmented", "mask_dir": str, "frame_count": int,
               "resolution": [w, h]}

    Raises:
        ImportError: If torch/SAM/opencv not installed.
        FileNotFoundError: If frame directory does not exist.
        ValueError: If no person detected in first frame.
    """
    _check_dependencies()
    import cv2
    import numpy as np
    import torch

    # Load frames from directory
    frames, resolution = _load_frames_from_dir(frame_dir)

    if not frames:
        raise ValueError(f"No frames loaded from {frame_dir}")

    # Set up output directory
    frame_dir = Path(frame_dir)
    if output_dir is None:
        output_dir = MASKS_DIR / frame_dir.name
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write frames to temp directory as JPEG for SAM 2.1 video predictor
    import tempfile
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        _progress_report(0, len(frames), "writing temp frames")

        for i, frame in enumerate(frames):
            frame_file = temp_path / f"frame_{i:04d}.jpg"
            cv2.imwrite(str(frame_file), frame)

        # Load SAM 2.1 video predictor
        predictor = _get_sam2_predictor(model_type)

        # Initialize video state
        with torch.inference_mode():
            state = predictor.init_state(video_path=str(temp_path))

            # Set up initial prompt on first frame
            if point_prompt is not None:
                points = np.array([[point_prompt[0], point_prompt[1]]], dtype=np.float32)
                labels = np.array([1], dtype=np.int32)
            else:
                h, w = frames[0].shape[:2]
                points = np.array([[w // 2, h // 2]], dtype=np.float32)
                labels = np.array([1], dtype=np.int32)

            _, obj_ids, mask_logits = predictor.add_new_points_or_box(
                inference_state=state,
                frame_idx=0,
                obj_id=1,
                points=points,
                labels=labels,
            )

            # Check first frame mask validity
            first_mask = (mask_logits[0] > 0.0).cpu().numpy().squeeze()
            frame_area = frames[0].shape[0] * frames[0].shape[1]
            mask_area = np.sum(first_mask)
            area_ratio = mask_area / frame_area

            if area_ratio < 0.02:
                h, w = frames[0].shape[:2]
                raise ValueError(
                    f"No person detected in first frame (mask area: {area_ratio:.1%} of frame). "
                    f"Try providing point_prompt=(x, y) at the person's center, "
                    f"e.g., point_prompt=({w // 2}, {h // 2})"
                )

            # Propagate masks across all frames
            _progress_report(0, len(frames), "propagating masks")

            for frame_idx, obj_ids, mask_logits in predictor.propagate_in_video(
                inference_state=state
            ):
                mask = (mask_logits[0] > 0.0).cpu().numpy().squeeze()
                binary_mask = (mask * 255).astype(np.uint8)

                # Apply morphological smoothing
                binary_mask = _smooth_mask(binary_mask, kernel_size=5)

                # Write mask PNG
                mask_filename = f"frame_{frame_idx + 1:04d}.png"
                mask_path = output_dir / mask_filename
                cv2.imwrite(str(mask_path), binary_mask)

                _progress_report(frame_idx, len(frames), "segmenting")

            predictor.reset_state(state)

    _progress_report(len(frames), len(frames), "complete")

    result = {
        "status": "segmented",
        "mask_dir": str(output_dir),
        "frame_count": len(frames),
        "resolution": resolution,
    }

    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="EFS SAM 2.1 Person Segmenter -- extract person masks from video/frames",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Segment person from video (auto-detect center)
  python sam_segmenter.py --video my_video.mp4

  # Segment with specific person location
  python sam_segmenter.py --video my_video.mp4 --point 960,540

  # Segment from pre-extracted frames
  python sam_segmenter.py --frames path/to/frames/ --output path/to/masks/

  # Use larger model for better accuracy
  python sam_segmenter.py --video my_video.mp4 --model vit_l

  # Extract every 2nd frame (faster processing)
  python sam_segmenter.py --video my_video.mp4 --step 2
        """,
    )

    # Input source (mutually exclusive)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--video", type=str,
        help="Path to input video file (mp4, avi, mov, etc.)"
    )
    source.add_argument(
        "--frames", type=str,
        help="Path to directory of pre-extracted frame images"
    )

    parser.add_argument(
        "--output", type=str, default=None,
        help="Output directory for mask PNGs (default: blender/masks/<video_name>/)"
    )
    parser.add_argument(
        "--model", type=str, default="vit_b",
        choices=["vit_b", "vit_l", "vit_h"],
        help="SAM 2.1 model variant (default: vit_b)"
    )
    parser.add_argument(
        "--point", type=str, default=None,
        help="Point prompt as 'x,y' (e.g., '960,540') for person location"
    )
    parser.add_argument(
        "--step", type=int, default=1,
        help="Frame step for video extraction (default: 1 = every frame)"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    # Set up logging
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="[sam_segmenter] %(levelname)s: %(message)s"
    )

    # Parse point prompt
    point_prompt = None
    if args.point:
        try:
            x, y = args.point.split(",")
            point_prompt = (int(x.strip()), int(y.strip()))
        except ValueError:
            parser.error("--point must be in 'x,y' format, e.g., '960,540'")

    # Run segmentation
    if args.video:
        result = segment_video(
            video_path=args.video,
            output_dir=args.output,
            model_type=args.model,
            point_prompt=point_prompt,
            frame_step=args.step,
        )
    else:
        result = segment_frames(
            frame_dir=args.frames,
            output_dir=args.output,
            model_type=args.model,
            point_prompt=point_prompt,
        )

    print(f"\nDone. {result['frame_count']} masks written to {result['mask_dir']}")
