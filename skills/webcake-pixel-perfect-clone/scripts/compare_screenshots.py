#!/usr/bin/env python3
"""Compare SAME-VIEWPORT page screenshots and output diff/overlay/JSON metrics.

Requires Pillow: python -m pip install pillow
Usage: python compare_screenshots.py ref.png clone.png --out ./qa --tolerance 16
Does NOT validate interactions or semantic completeness.
"""
import argparse
import json
import pathlib
import sys
from PIL import Image, ImageChops, ImageEnhance, ImageStat


def main():
    ap = argparse.ArgumentParser(description="Compare same-size screenshots and create visual diff and report")
    ap.add_argument("reference", help="Reference screenshot PNG/JPEG")
    ap.add_argument("clone", help="Webcake screenshot PNG/JPEG")
    ap.add_argument("--out", default="./qa", help="Output directory")
    ap.add_argument("--tolerance", type=int, default=16, help="Pixel max-channel difference threshold [0..255]")
    args = ap.parse_args()
    if not 0 <= args.tolerance <= 255:
        ap.error("--tolerance must be from 0 to 255")

    a = Image.open(args.reference).convert("RGB")
    b = Image.open(args.clone).convert("RGB")
    if a.size != b.size:
        print(f"ERROR: different sizes: reference={a.size} clone={b.size}. Capture SAME viewport/full-page height; do not resize to hide layout differences.", file=sys.stderr)
        return 2

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    diff = ImageChops.difference(a, b)
    means = ImageStat.Stat(diff).mean
    mae = sum(means) / 3
    pixels = list(diff.getdata())
    mismatches = sum(1 for r, g, blue in pixels if max(r, g, blue) > args.tolerance)
    ratio = (mismatches / len(pixels)) * 100 if pixels else 0.0
    enhanced = ImageEnhance.Contrast(diff).enhance(2.5)
    enhanced.save(out / "diff.png")
    Image.blend(a, b, alpha=0.5).save(out / "overlay.png")
    report = {
        "reference": str(args.reference),
        "clone": str(args.clone),
        "width": a.width,
        "height": a.height,
        "tolerance_max_channel": args.tolerance,
        "mae_0_to_255": round(mae, 3),
        "mismatched_pixels": mismatches,
        "mismatched_percent": round(ratio, 3),
        "limitations": "Pixel comparison only. Does not prove interactive or content accuracy. Dynamic UI/anti-aliasing may differ."
    }
    (out / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
