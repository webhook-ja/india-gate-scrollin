"""8K-style Fooocus Upscale 2x from original backups + sharp export."""
import base64
import json
import shutil
import sys
import time
import uuid
import urllib.error
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FOOOCUS = "http://127.0.0.1:42021"
ROOT = Path(r"C:\Users\TRENDING PC\Documents\servicios\Web_central\Web_test_scrollin")
BACKUP = ROOT / "media" / "stills-backup"
OUT = ROOT / "media" / "enhanced-8k"
OUTPUTS = Path(r"C:\pinokio\api\fooocus.git\app\outputs")
OUT.mkdir(parents=True, exist_ok=True)

# Source from originals (not already-soft AI passes)
JOBS = [
    (
        BACKUP / "scene-00-brand.png",
        "scene-00-brand",
        "ultra sharp 8k photograph of Taj Mahal golden hour, preserve India Gate namaste logo and INDIA GATE text exactly, crystal reflection, photoreal HDR, razor sharp detail",
        "Upscale (2x)",
        0.12,
    ),
    (
        BACKUP / "scene-01.png",
        "scene-01",
        "ultra sharp 8k food photography Indian feast, brass thali, crisp spice texture, razor sharp details, cinematic restaurant light, photoreal",
        "Upscale (2x)",
        0.25,
    ),
    (
        BACKUP / "scene-02.png",
        "scene-02",
        "ultra sharp 8k Indian curry rice naan food photo, crisp steam and texture, vibrant color, photoreal restaurant photography",
        "Upscale (2x)",
        0.25,
    ),
    (
        BACKUP / "scene-03.png",
        "scene-03",
        "ultra sharp 8k signature Indian dish close-up, glossy sauce micro detail, crisp garnish, photoreal food photography",
        "Upscale (2x)",
        0.25,
    ),
]

STYLES = ["Fooocus V2", "Fooocus Enhance", "Fooocus Photograph", "Fooocus Sharp", "Fooocus Masterpiece"]
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


def apply_job(data, params, prompt, image_path, method, denoise):
    indices = {}
    for i, p in enumerate(params):
        lab = p.get("label", "")
        indices.setdefault(lab, []).append(i)
        if p.get("component") == "Image":
            data[i] = None

    def set_first(label, value):
        if label in indices:
            data[indices[label][0]] = value

    data[1] = prompt
    set_first("Negative Prompt", "blurry, soft focus, lowres, noisy, artifacts, watermark, deformed, jpeg artifacts")
    set_first("Selected Styles", STYLES)
    set_first("Performance", "Quality")
    set_first("Aspect Ratios", ASPECT)
    set_first("Image Number", 1)
    set_first("Output Format", "png")
    set_first("Seed", "7")
    set_first("Image Sharpness", 12.0)
    set_first("Guidance Scale", 3.5)
    set_first("Input Image", True)
    data[31] = "uov"
    set_first("Upscale or Variation:", method)
    data[33] = image_to_data_uri(Path(image_path))
    # Forced overwrite denoise of upscale
    data[55] = float(denoise)
    print(f"method={method} denoise={denoise} sharp={data[10]}")
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
    http_json(f"{FOOOCUS}/api/predict/", {"data": [None] + data, "fn_index": 67, "session_hash": session}, timeout=90)
    t0 = time.time()
    last_images = []
    while True:
        res = http_json(
            f"{FOOOCUS}/api/predict/",
            {"data": [None], "fn_index": 68, "session_hash": session},
            timeout=240,
        )
        paths = extract_paths(res)
        if paths:
            last_images = paths
        if not res.get("is_generating", False):
            return last_images or paths, time.time() - t0
        if time.time() - t0 > 900:
            raise TimeoutError("timeout")
        time.sleep(0.4)


def main():
    print("Building defaults...")
    base, params = build_defaults()
    for src, name, prompt, method, denoise in JOBS:
        if not src.exists():
            print("SKIP", src)
            continue
        print(f"\n=== {name} {method} ===")
        data = apply_job(list(base), params, prompt, str(src.resolve()), method, denoise)
        try:
            paths, elapsed = generate(data)
        except Exception as e:
            print("ERROR", e)
            continue
        print(f"done {elapsed:.1f}s -> {paths[:1]}")
        chosen = next((Path(p) for p in paths if Path(p).exists()), None)
        if chosen:
            dest = OUT / f"{name}-8k.png"
            shutil.copy2(chosen, dest)
            print("saved", dest, dest.stat().st_size)
        else:
            print("no output")
    print("\nAll done")


if __name__ == "__main__":
    main()
