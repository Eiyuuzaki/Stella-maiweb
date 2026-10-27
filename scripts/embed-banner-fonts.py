"""Embed the banner font subsets into docs/banner-*.svg as data URIs.

GitHub serves README SVGs through <img>, which blocks external resources but
allows inline data-URI fonts — this is what makes WenKai / the title face
render on GitHub. Idempotent: it refills <style id="banner-fonts"> in place.

Run after subset-about-font.py whenever the banner text changes.
"""

from __future__ import annotations

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "src" / "fonts"
DOCS = ROOT / "docs"
STYLE_ID = "banner-fonts"

FACES = [
    ("LXGW WenKai Banner", FONTS / "lxgw-wenkai-banner.woff2", ""),
    ("Stella Title Banner", FONTS / "google-sans-stella.woff2", "font-weight:600;"),
]

PATTERN = re.compile(
    r'<style id="' + STYLE_ID + r'">.*?</style>', re.DOTALL)


def build_style() -> str:
    rules = []
    for family, path, extra in FACES:
        if not path.exists():
            print(f"embed fonts: {path.name} 不存在，该字体跳过")
            continue
        payload = base64.b64encode(path.read_bytes()).decode("ascii")
        rules.append(
            f"@font-face{{font-family:'{family}';{extra}"
            f"src:url(data:font/woff2;base64,{payload}) format('woff2')}}"
        )
    return "".join(rules)


def main() -> int:
    style = build_style()
    for svg in sorted(DOCS.glob("banner-*.svg")):
        text = svg.read_text(encoding="utf-8")
        replacement = f'<style id="{STYLE_ID}">{style}</style>'
        if PATTERN.search(text):
            text = PATTERN.sub(replacement, text)
        else:
            text = text.replace("</defs>", f"{replacement}</defs>")
        svg.write_text(text, encoding="utf-8")
        print(f"embed fonts: {svg.name} -> {len(style) // 1024} KB style")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
