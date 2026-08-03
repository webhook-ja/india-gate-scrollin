"""Ken Burns dives for feast-path hero dishes (sizzler, biryani, firma)."""
from __future__ import annotations

import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
STILLS = BASE / "public" / "scroll-world" / "stills" / "feast"
OUT = BASE / "public" / "scroll-world" / "video"
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    ("03-sizzler.png", "dive-feast-sizzler", True),
    ("02-biryani.png", "dive-feast-biryani", False),
    ("06-curry-firma.png", "dive-feast-firma", False),
]


def run(still: Path, dest: Path, vf: str, duration: str, crf: str) -> None:
    cmd = [
        "ffmpeg", "-y", "-loop", "1", "-i", str(still),
        "-vf", vf, "-t", duration,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", crf, "-preset", "medium", "-movflags", "+faststart",
        str(dest),
    ]
    print("RUN", dest.name)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:])
        raise SystemExit(r.returncode)
    print("ok", dest.stat().st_size)


def main() -> None:
    for filename, stem, landscape in JOBS:
        still = STILLS / filename
        if not still.exists():
            print("MISSING", still)
            continue

        if landscape:
            desktop_vf = (
                "scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1200,"
                "zoompan=z='min(1.14,1+0.0004*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                "d=120:s=1280x800:fps=30,format=yuv420p"
            )
            mobile_vf = (
                "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,"
                "zoompan=z='min(1.1,1+0.00032*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                "d=90:s=720x900:fps=24,format=yuv420p"
            )
        else:
            desktop_vf = (
                "scale=1620:2025:force_original_aspect_ratio=increase,crop=1620:2025,"
                "zoompan=z='min(1.14,1+0.0004*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                "d=120:s=1080x1350:fps=30,format=yuv420p"
            )
            mobile_vf = (
                "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,"
                "zoompan=z='min(1.1,1+0.00032*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                "d=90:s=720x900:fps=24,format=yuv420p"
            )

        run(still, OUT / f"{stem}.mp4", desktop_vf, "4", "18")
        run(still, OUT / f"{stem}-m.mp4", mobile_vf, "3.75", "20")

        # poster = first frame of desktop clip
        poster = STILLS.parent / f"poster-{stem}.png"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", "0", "-i", str(OUT / f"{stem}.mp4"),
             "-frames:v", "1", "-update", "1", str(poster)],
            capture_output=True, check=True,
        )
        print("poster", poster.name)

    print("KEN_BURNS_DONE")


if __name__ == "__main__":
    main()
