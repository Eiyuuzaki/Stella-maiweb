"""Regenerate the About-page WenKai subset from the characters actually used.

`lxgw-wenkai-about.woff2` was hand-subsetted when the About page was small;
new text (disclaimer, features…) falls back to system fonts until this runs.
Also builds `lxgw-wenkai-banner.woff2`, the tiny subset embedded into the
GitHub banner SVGs. Skips silently when the full font is not cached.

Run automatically before Vite build/dev (see package.json).
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
CACHE = ROOT.parent / ".cache"
SOURCE = CACHE / "LXGWWenKai-Regular.ttf"
ABOUT_OUTPUT = SRC / "fonts" / "lxgw-wenkai-about.woff2"
BANNER_OUTPUT = SRC / "fonts" / "lxgw-wenkai-banner.woff2"
ABOUT_PAGE = SRC / "AboutPage.jsx"

# 与 about-font.css 的 unicode-range 保持一致（含横幅用到的 – — 连接号）。
KEEP = re.compile(
    "[\u0020-\u007e\u2010-\u2015\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]"
)

BANNER_TEXT = (
    "ステラ 舞萌 DX 的 Web 控制台 Astral 背后的协议库"
    "夜空一直在等待着被点亮的那一天。— じん《ステラ》Stella"
)


def used_chars() -> str:
    text = ABOUT_PAGE.read_text(encoding="utf-8")
    return "".join(sorted(set(KEEP.findall(text))))


def subset(text: str, output: Path) -> None:
    subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset", str(SOURCE),
            f"--text={text}", f"--output-file={output}",
            "--flavor=woff2", "--layout-features=", "--desubroutinize",
            "--no-hinting", "--name-IDs=*",
        ],
        check=True,
    )


def main() -> int:
    if not SOURCE.exists():
        print(f"about fonts: {SOURCE} 不存在，保留现有子集")
        return 0

    about_text = used_chars()
    subset(about_text, ABOUT_OUTPUT)
    print(f"about fonts: lxgw-wenkai-about.woff2 {len(about_text)} 字 "
          f"{ABOUT_OUTPUT.stat().st_size // 1024} KB")

    banner_text = "".join(sorted(set(KEEP.findall(BANNER_TEXT))))
    subset(banner_text, BANNER_OUTPUT)
    print(f"about fonts: lxgw-wenkai-banner.woff2 {len(banner_text)} 字 "
          f"{BANNER_OUTPUT.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
