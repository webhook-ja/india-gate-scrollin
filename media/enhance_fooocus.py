"""Enhance stills via Fooocus Upscale using raw Gradio /api/predict (same as api_bridge)."""
import base64
import io
import json
import shutil
import sys
import time
import uuid
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

FOOOCUS = "http://127.0.0.1:42021"
ROOT = Path(r"C:\Users\TRENDING PC\Documents\servicios\Web_central\Web_test_scrollin")
STILLS = ROOT / "public" / "scroll-world" / "stills"
OUT = ROOT / "media" / "enhanced"
OUTPUTS = Path(r"C:\pinokio\api\fooocus.git\app\outputs")
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    (STILLS / "scene-00-brand.png", "scene-00-brand",
     "cinematic Taj Mahal golden hour, crystal reflection pool, ultra detailed marble, sharp trees, photoreal HDR"),
    (STILLS / "scene-01.png", "scene-01",
     "photoreal Indian feast brass thali, spices, warm restaurant light, sharp food photography, cinematic"),
    (STILLS / "scene-02.png", "scene-02",
     "photoreal Indian curry rice naan, vibrant colors, sharp detail, warm golden light, cinematic food photo"),
    (STILLS / "scene-03.png", "scene-03",
     "photoreal signature Indian dish close-up, glossy sauce, sharp restaurant food photography, cinematic"),
]

STYLES = ["Fooocus V2", "Fooocus Enhance", "Fooocus Photograph", "Fooocus Cinematic", "Fooocus Sharp"]
ASPECT = '896×1152 <span style="color: grey;"> ∣ 7:9</span>'


def http_json(url, data=None, timeout=120):
    if data is None:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def image_to_data_uri(path: Path) -> str:
    raw = path.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    suffix = path.suffix.lower().lstrip(".") or "png"
    if suffix == "jpg":
        suffix = "jpeg"
    return f"data:image/{suffix};base64,{b64}"


def build_defaults():
    config = http_json(f"{FOOOCUS}/config/")
    info = http_json(f"{FOOOCUS}/info/")
    params = info["unnamed_endpoints"]["67"]["parameters"]
    comp_by_id = {c["id"]: c for c in config["components"]}
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
                if default is None:
                    default = val
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
    assert len(data) == 152, len(data)
    return data, params


def apply_job(data, params, prompt, image_path):
    indices = {}
    for i, p in enumerate(params):
        lab = p.get("label", "")
        indices.setdefault(lab, []).append(i)
        if p.get("component") == "Image":
            data[i] = None

    def set_first(label, value):
        if label in indices:
            data[indices[label][0]] = value

    data[1] = prompt  # parameter_12
    set_first("Negative Prompt", "blurry, lowres, noisy, artifacts, watermark, deformed")
    set_first("Selected Styles", STYLES)
    set_first("Performance", "Quality")
    set_first("Aspect Ratios", ASPECT)
    set_first("Image Number", 1)
    set_first("Output Format", "png")
    set_first("Seed", "42")
    set_first("Image Sharpness", 4.0)
    set_first("Guidance Scale", 4.0)
    set_first("Input Image", True)
    data[31] = "uov"  # parameter_212 tab
    set_first("Upscale or Variation:", "Upscale (1.5x)")
    data[33] = image_to_data_uri(Path(image_path))
    print("aspect=", data[5])
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
    try:
        http_json(f"{FOOOCUS}/api/predict/", payload, timeout=60)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"fn67 failed: {e.code} {body[:500]}") from e
    t0 = time.time()
    last_images = []
    while True:
        try:
            res = http_json(
                f"{FOOOCUS}/api/predict/",
                {"data": [None], "fn_index": 68, "session_hash": session},
                timeout=180,
            )
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"fn68 failed: {e.code} {body[:500]}") from e
        paths = extract_paths(res)
        if paths:
            last_images = paths
        if not res.get("is_generating", False):
            return last_images or paths, time.time() - t0
        if time.time() - t0 > 600:
            raise TimeoutError("Fooocus generation timed out")
        time.sleep(0.5)


def newest_fallback(after_ts):
    files = list(OUTPUTS.rglob("*.png"))
    if not files:
        return None
    recent = [p for p in files if p.stat().st_mtime >= after_ts - 5]
    pool = recent or files
    return max(pool, key=lambda p: p.stat().st_mtime)


def main():
    print("Building defaults from Fooocus...")
    base, params = build_defaults()
    print(f"defaults ok ({len(base)})")

    for src, name, prompt in JOBS:
        if not src.exists():
            print("SKIP", src)
            continue
        print(f"\n=== {name} Upscale 1.5x ===")
        data = apply_job(list(base), params, prompt, str(src.resolve()))
        stamp = time.time()
        try:
            paths, elapsed = generate(data)
        except Exception as e:
            print("ERROR", e)
            continue
        print(f"done in {elapsed:.1f}s paths={paths[:3]}")
        chosen = None
        for p in paths:
            pp = Path(p)
            if pp.exists():
                chosen = pp
                break
        if not chosen and paths:
            chosen = newest_fallback(stamp)
        if chosen and chosen.exists() and paths:
            dest = OUT / f"{name}-enhanced.png"
            shutil.copy2(chosen, dest)
            print("saved", dest, dest.stat().st_size)
        else:
            print("no output file (generation likely failed)")

    print("\nAll done")


if __name__ == "__main__":
    main()
