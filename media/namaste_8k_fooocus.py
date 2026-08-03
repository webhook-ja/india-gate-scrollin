"""Clean namaste clipart → Fooocus Upscale 2x (x2) → white transparent ~8K."""
from __future__ import annotations

import base64
import json
import shutil
import sys
import time
import uuid
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FOOOCUS = "http://127.0.0.1:42021"
ROOT = Path(r"C:\Users\TRENDING PC\Documents\servicios\Web_central\Web_test_scrollin")
SRC = Path(
    r"C:\Users\TRENDING PC\.cursor\projects"
    r"\c-Users-TRENDING-PC-Documents-servicios-Web-central-Web-test-scrollin\assets"
    r"\c__Users_TRENDING_PC_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"a27f9de6da7d38250c6e1c4647aea3bb_images_222-2224733_namaste-logo-png-clipart-"
    r"cfe12dbc-7450-4b8a-9b18-1156a648c37b.png"
)
WORK = ROOT / "media" / "namaste-8k"
BRAND = ROOT / "public" / "brand"
OUTPUTS = Path(r"C:\pinokio\api\fooocus.git\app\outputs")
WORK.mkdir(parents=True, exist_ok=True)
BRAND.mkdir(parents=True, exist_ok=True)

STYLES = ["Fooocus V2", "Fooocus Enhance", "Fooocus Sharp", "Fooocus Masterpiece"]
# Portrait-ish to match namaste proportions
ASPECT = '896×1152 <span style="color: grey;"> ∣ 7:9</span>'
PROMPT = (
    "ultra sharp 8k white line art namaste silhouette logo, clean vector-like strokes, "
    "pure white lines on pure black background, crisp edges, no blur, no gray, "
    "high contrast stencil line drawing, razor sharp"
)
NEG = "blurry, soft, gray, noise, texture fill, watermark, color, photoreal, 3d, lowres"


def http_json(url, data=None, timeout=180):
    if data is None:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def image_to_data_uri(path: Path) -> str:
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def prep_input() -> Path:
    im = Image.open(SRC).convert("RGBA")
    arr = np.array(im).astype(np.float32)
    # luminance — white lines on black
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    # force pure B/W
    white = lum > 40
    out = np.zeros_like(arr)
    out[white, 0:3] = 255
    out[white, 3] = 255
    out[~white, 0:3] = 0
    out[~white, 3] = 255  # solid black bg for Fooocus
    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    # pad square-ish for model
    pad = 40
    canvas = Image.new("RGB", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0))
    canvas.paste(img.convert("RGB"), (pad, pad), img.split()[-1])
    # mild pre-upscale so Fooocus has more meat
    canvas = canvas.resize(
        (canvas.width * 2, canvas.height * 2), Image.Resampling.LANCZOS
    )
    dest = WORK / "namaste-input.png"
    canvas.save(dest, "PNG")
    print("prep", dest, canvas.size)
    return dest


def to_white_transparent(path: Path, dest: Path, target_h: int = 8192) -> Path:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im).astype(np.float32)
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    # keep bright strokes only
    strength = np.clip((lum - 30) / 140.0, 0, 1)
    out = np.zeros_like(arr)
    out[..., 0] = 255
    out[..., 1] = 255
    out[..., 2] = 247
    out[..., 3] = strength * 255
    out[out[..., 3] < 18, 3] = 0
    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    pad = 64
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad), img)
    if canvas.height < target_h:
        scale = target_h / canvas.height
        canvas = canvas.resize(
            (int(canvas.width * scale), target_h), Image.Resampling.LANCZOS
        )
        canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.8, percent=110, threshold=1))
    canvas.save(dest, "PNG", optimize=True)
    print("final", dest, canvas.size, dest.stat().st_size)
    return dest


def build_defaults():
    config = http_json(f"{FOOOCUS}/config/")
    info = http_json(f"{FOOOCUS}/info/")
    params = info["unnamed_endpoints"]["67"]["parameters"]
    data = []
    for p in params:
        label = p.get("label", "")
        default = None
        for c in config["components"]:
            if c.get("props", {}).get("label") == label:
                val = c["props"].get("value")
                if val is not None:
                    default = val
                    break
        comp = p.get("component", "")
        if default is not None:
            data.append(default)
        elif comp == "Checkbox":
            data.append(False)
        elif comp == "Checkboxgroup":
            data.append([])
        elif comp == "Image":
            data.append(None)
        elif comp == "Slider":
            data.append(0)
        elif comp == "Textbox":
            data.append("")
        else:
            data.append(None)
    print("defaults", len(data))
    return data, params


def apply_job(data, params, image_path: Path, method: str = "Upscale (2x)"):
    indices: dict[str, list[int]] = {}
    for i, p in enumerate(params):
        lab = p.get("label", "")
        indices.setdefault(lab, []).append(i)
        if p.get("component") == "Image":
            data[i] = None

    def set_first(label, value):
        if label in indices:
            data[indices[label][0]] = value

    data[1] = PROMPT
    set_first("Negative Prompt", NEG)
    set_first("Selected Styles", STYLES)
    set_first("Performance", "Quality")
    set_first("Aspect Ratios", ASPECT)
    set_first("Image Number", 1)
    set_first("Output Format", "png")
    set_first("Seed", "7")
    set_first("Image Sharpness", 8.0)
    set_first("Guidance Scale", 3.5)
    set_first("Input Image", True)
    data[31] = "uov"
    set_first("Upscale or Variation:", method)
    data[33] = image_to_data_uri(image_path)
    return data


def extract_paths(obj, found=None):
    if found is None:
        found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("name", "path") and isinstance(v, str) and v.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                found.append(v)
            else:
                extract_paths(v, found)
    elif isinstance(obj, list):
        for v in obj:
            extract_paths(v, found)
    return found


def generate(data):
    session = uuid.uuid4().hex
    payload = {"data": [None] + data, "fn_index": 67, "session_hash": session}
    http_json(f"{FOOOCUS}/api/predict/", payload, timeout=90)
    t0 = time.time()
    last = []
    while True:
        res = http_json(
            f"{FOOOCUS}/api/predict/",
            {"data": [None], "fn_index": 68, "session_hash": session},
            timeout=300,
        )
        paths = extract_paths(res)
        if paths:
            last = paths
        if not res.get("is_generating", False):
            return last or paths, time.time() - t0
        if time.time() - t0 > 900:
            raise TimeoutError("Fooocus timeout")
        time.sleep(0.6)


def newest_fallback(after_ts: float) -> Path | None:
    files = list(OUTPUTS.rglob("*.png"))
    if not files:
        return None
    recent = [p for p in files if p.stat().st_mtime >= after_ts - 5]
    pool = recent or files
    return max(pool, key=lambda p: p.stat().st_mtime)


def fooocus_upscale(src: Path, tag: str) -> Path:
    print(f"\n=== Fooocus Upscale 2x → {tag} ===")
    base, params = build_defaults()
    data = apply_job(list(base), params, src, "Upscale (2x)")
    stamp = time.time()
    paths, elapsed = generate(data)
    print(f"done {elapsed:.1f}s", paths[:2])
    chosen = None
    for p in paths:
        pp = Path(p)
        if pp.exists():
            chosen = pp
            break
    if not chosen:
        chosen = newest_fallback(stamp)
    if not chosen or not chosen.exists():
        raise RuntimeError("No Fooocus output")
    dest = WORK / f"{tag}.png"
    shutil.copy2(chosen, dest)
    print("saved", dest, Image.open(dest).size)
    return dest


def main():
    cleaned = prep_input()
    # Pass 1: ~2x from prepped (~800px → ~1600+)
    p1 = fooocus_upscale(cleaned, "namaste-uov-1")
    # Pass 2: another 2x toward 8k
    p2 = fooocus_upscale(p1, "namaste-uov-2")
    # Force white on transparent + stretch long side to ~8k
    final = to_white_transparent(p2, BRAND / "namaste-white-8k.png", target_h=8192)
    # Also nav-sized
    nav = Image.open(final)
    side = max(nav.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(nav, ((side - nav.width) // 2, (side - nav.height) // 2), nav)
    sq.resize((512, 512), Image.Resampling.LANCZOS).save(BRAND / "nav-namaste.png", "PNG")
    print("DONE", final)


if __name__ == "__main__":
    main()
