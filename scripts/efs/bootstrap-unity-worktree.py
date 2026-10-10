#!/usr/bin/env python3
"""Safely seed a Unity worktree from a warmed canonical Library cache.

Only unity/Library is copied. ProjectVersion and packages-lock are compared
before any mutation; mismatches fail closed. The canonical checkout is never
written.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

EXPECTED_UNITY = "2021.2.8f1"
MARKER = ".efs-prewarm.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def project_inputs(unity: Path) -> dict[str, str]:
    version_file = unity / "ProjectSettings" / "ProjectVersion.txt"
    lock_file = unity / "Packages" / "packages-lock.json"
    if not version_file.is_file() or not lock_file.is_file():
        raise RuntimeError("missing ProjectVersion.txt or packages-lock.json")
    version = version_file.read_text(encoding="utf-8").splitlines()[0].strip()
    return {
        "unity_version": version.removeprefix("m_EditorVersion: ").strip(),
        "project_version_sha256": sha256(version_file),
        "packages_lock_sha256": sha256(lock_file),
    }


def fail(message: str) -> int:
    print(f"ERROR: {message}", file=sys.stderr)
    return 2


COPY_DIRS = ("APIUpdater", "Bee", "PackageManager", "Recorder", "ScriptAssemblies", "Search", "ShaderCache", "SourceAssetDB", "StateCache", "TempArtifacts", "metadata")
COPY_FILES = ("AnnotationManager", "ArtifactDB", "ArtifactDB-lock", "LibraryFormatVersion.txt", "ScriptMapper", "ShaderCache.db", "SourceAssetDB", "SourceAssetDB-lock")


def copy_library(source: Path, target: Path) -> None:
    """Copy writable generated state, and link immutable package contents."""
    if os.name == "nt":
        target.parent.mkdir(parents=True, exist_ok=True)
        target.mkdir(parents=True, exist_ok=True)
        for name in COPY_DIRS:
            source_dir = source / name
            if not source_dir.is_dir():
                continue
            result = subprocess.run(
                ["robocopy", str(source_dir), str(target / name), "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:1", "/W:1", "/XJ"],
                check=False,
                stdout=subprocess.DEVNULL,
            )
            if result.returncode >= 8:
                raise RuntimeError(f"robocopy failed for {name} with exit code {result.returncode}")
        for name in COPY_FILES:
            source_file = source / name
            if source_file.is_file():
                shutil.copy2(source_file, target / name)
        package_cache = source / "PackageCache"
        if package_cache.is_dir():
            if (target / "PackageCache").exists():
                print("PACKAGE_CACHE=existing; not replacing an interrupted copy")
            else:
                result = subprocess.run(["cmd.exe", "/c", "mklink", "/J", str(target / "PackageCache"), str(package_cache)], check=False, capture_output=True, text=True)
                if result.returncode != 0:
                    raise RuntimeError(f"could not link immutable PackageCache: {result.stderr.strip()}")
    else:
        target.mkdir(parents=True, exist_ok=True)
        for name in COPY_DIRS:
            if (source / name).is_dir():
                shutil.copytree(source / name, target / name, dirs_exist_ok=True, symlinks=False)
        if (source / "PackageCache").is_dir():
            (target / "PackageCache").symlink_to(source / "PackageCache", target_is_directory=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--check", action="store_true", help="validate only; never copy")
    parser.add_argument("--prewarm", action="store_true", help="copy the compatible Library cache")
    parser.add_argument("--resume-partial", action="store_true", help="resume an explicitly interrupted prewarm in this worktree")
    args = parser.parse_args()
    if args.check == args.prewarm:
        return fail("choose exactly one of --check or --prewarm")

    started = time.monotonic()
    project = args.project_root.resolve()
    canonical = args.canonical.resolve()
    target_unity = project / "unity"
    source_unity = canonical / "unity"
    source_library = source_unity / "Library"
    target_library = target_unity / "Library"
    marker = target_unity / MARKER

    if project == canonical:
        return fail("project root must be a worktree, not the canonical checkout")
    if not source_library.is_dir():
        return fail(f"canonical generated cache is missing: {source_library}")
    try:
        expected = project_inputs(source_unity)
        actual = project_inputs(target_unity)
    except (OSError, RuntimeError) as exc:
        return fail(str(exc))
    if expected != actual:
        return fail("ProjectVersion/packages-lock mismatch; refusing to seed Library")
    if expected["unity_version"] != EXPECTED_UNITY:
        return fail(f"unsupported Unity editor {expected['unity_version']}; expected {EXPECTED_UNITY}")

    source_stat = source_library.stat()
    print(f"CACHE_SOURCE={source_library}")
    print(f"CACHE_INPUTS={json.dumps(expected, sort_keys=True)}")
    print(f"CACHE_SOURCE_MTIME_NS={source_stat.st_mtime_ns}")
    if marker.exists():
        try:
            prior = json.loads(marker.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return fail(f"invalid prewarm marker {marker}: {exc}")
        if prior.get("inputs") != expected:
            return fail("existing prewarm marker has stale compatibility inputs")
        if prior.get("canonical_library") != str(source_library):
            return fail("existing prewarm marker points at a different canonical cache")

    if args.check:
        if target_library.is_dir():
            print(f"TARGET_LIBRARY=present ({target_library})")
            print("CHECK=compatible; no copy performed")
        else:
            print(f"TARGET_LIBRARY=missing ({target_library})")
            print("CHECK=compatible; --prewarm will copy cache")
        print(f"ELAPSED_SECONDS={time.monotonic() - started:.3f}")
        return 0

    if marker.exists() and target_library.is_dir() and not args.resume_partial:
        print("PREWARM=already-compatible; no copy performed")
    else:
        if target_library.exists() and not args.resume_partial:
            return fail(f"refusing to overwrite unmarked target Library: {target_library}")
        print(f"COPYING={source_library} -> {target_library}")
        copy_library(source_library, target_library)
        marker.write_text(json.dumps({
            "schema": 1,
            "canonical_library": str(source_library),
            "inputs": expected,
            "copied_at_unix": time.time(),
            "mode": "copy-generated-state-and-link-immutable-PackageCache",
        }, indent=2) + "\n", encoding="utf-8")
        print("PREWARM=copied")
    print(f"ELAPSED_SECONDS={time.monotonic() - started:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
