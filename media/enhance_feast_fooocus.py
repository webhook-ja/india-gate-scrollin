"""Upscale feast-path dish stills via Fooocus (Pinokio :42021)."""
from __future__ import annotations

import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "media"))

from enhance_fooocus import (  # noqa: E402
    OUTPUTS,
    apply_job,
    build_defaults,
    generate,
    newest_fallback,
)

SRC = ROOT / "media" / "feast-path"
OUT = ROOT / "media" / "feast-path" / "enhanced"
PUB = ROOT / "public" / "scroll-world" / "stills" / "feast"
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    ("01-samosas.png", "01-samosas",
     "photoreal crispy golden samosas on white plate, mint garnish, lemon, sharp food photography, restaurant lighting"),
    ("02-biryani.png", "02-biryani",
     "photoreal Indian biryani in hammered copper bowl, mint garnish, warm restaurant light, sharp detail"),
    ("03-sizzler.png", "03-sizzler",
     "photoreal tandoori chicken sizzler platter, peppers onions lemon, cast iron, cinematic food photo sharp"),
    ("04-curry-rojo.png", "04-curry-rojo",
     "photoreal Indian curry in copper karahi with brass handles, cilantro garnish, glossy sauce, sharp"),
    ("05-naan.png", "05-naan",
     "photoreal tandoor naan bread in dark woven basket, charred spots, warm light, sharp food photography"),
    ("06-curry-firma.png", "06-curry-firma",
     "photoreal creamy Indian curry in metal bowl brass handles, onion ring garnish, spoon, sharp cinematic"),
]


def main() -> None:
    print("Building Fooocus defaults...")
    base, params = build_defaults()
    for filename, name, prompt in JOBS:
        src = SRC / filename
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
        if not chosen:
            chosen = newest_fallback(stamp)
        if chosen and chosen.exists():
            dest = OUT / f"{name}-hq.png"
            pub = PUB / f"{name}.png"
            shutil.copy2(chosen, dest)
            shutil.copy2(chosen, pub)
            print("saved", dest, "->", pub)
        else:
            print("no output")
    print("\nFEAST_FOOOCUS_DONE")


if __name__ == "__main__":
    main()
