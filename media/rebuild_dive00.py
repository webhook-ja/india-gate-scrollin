"""Rebuild dive-00 Ken Burns from classy brand still — no sharpen."""
from __future__ import annotations

import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
STILL = BASE / "public" / "scroll-world" / "stills" / "scene-00-brand.png"
OUT = BASE / "public" / "scroll-world" / "video"


def run(vf: str, dest: Path, duration: str, crf: str) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(STILL),
        "-vf",
        vf,
        "-t",
        duration,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        crf,
        "-preset",
        "medium",
        "-movflags",
        "+faststart",
        str(dest),
    ]
    print("RUN", dest.name)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        raise SystemExit(r.returncode)
    print("ok", dest.stat().st_size)


def main() -> None:
    run(
        "scale=1620:2025:force_original_aspect_ratio=increase,"
        "crop=1620:2025,"
        "zoompan=z='min(1.12,1+0.00035*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        "d=120:s=1080x1350:fps=30,"
        "format=yuv420p",
        OUT / "dive-00.mp4",
        "4",
        "18",
    )
    run(
        "scale=1080:1350:force_original_aspect_ratio=increase,"
        "crop=1080:1350,"
        "zoompan=z='min(1.08,1+0.00028*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        "d=90:s=720x900:fps=24,"
        "format=yuv420p",
        OUT / "dive-00-m.mp4",
        "3.75",
        "20",
    )
    print("DIVE00_DONE")


if __name__ == "__main__":
    main()
