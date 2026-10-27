"""Build the two UI font subsets from the characters actually used in web/src.

Run automatically before Vite build and dev. New pages only need a rebuild:
the script scans every .js/.jsx file, so newly introduced Chinese characters
are added to Noto Sans SC. Unchanged text keeps the existing woff2 files.
"""

from __future__ import annotations

import hashlib
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
CACHE = ROOT.parent / ".cache"
LATIN = SRC / "fonts" / "google-sans-ui.woff2"
CHINESE_DIR = SRC / "fonts" / "noto"
STAMP = CACHE / "ui-font-source.sha256"
LATIN_TEXT = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    "0123456789 .,;:!?/\\-+*()[]{}<>'\"_=%#@&|`~$^"
    "°×ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß"
    "àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ"
)


def source_digest() -> str:
    digest = hashlib.sha256()
    for path in sorted(SRC.rglob("*")):
        if path.suffix.lower() in {".js", ".jsx", ".json"}:
            digest.update(path.relative_to(SRC).as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


# 假名（歌名）、长破折号/弯引号、希腊/西里尔（Λ Ξ Я）、
# 带圈数字/几何形状/星花音符（⑨ △ ◆ ★ ♪ ✪）都来自 version-charts.json。
CHAR_RE = re.compile(
    "[\u2010-\u2044\u2100-\u22ff\u2460-\u24ff\u25a0-\u25ff"
    "\u2600-\u27bf\u2900-\u297f\u3000-\u30ff\u3200-\u32ff"
    "\u0370-\u03ff\u0400-\u04ff\u4e00-\u9fff\uff00-\uffef]")


def chinese_text() -> str:
    found = set()
    for path in SRC.rglob("*"):
        if path.suffix.lower() not in {".js", ".jsx", ".json"}:
            continue
        found.update(CHAR_RE.findall(
            path.read_text(encoding="utf-8", errors="ignore")))
    return "".join(sorted(found))


def chars_in_range(text: str, unicode_range: str) -> str:
    start_text, end_text = unicode_range.removeprefix("U+").split("-")
    start, end = int(start_text, 16), int(end_text, 16)
    return "".join(char for char in text if start <= ord(char) <= end)


def subset(source: Path, output: Path, text: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        sys.executable, "-m", "fontTools.subset", str(source),
        f"--text={text}", f"--output-file={output}",
        "--flavor=woff2", "--layout-features=", "--desubroutinize",
        "--no-hinting", "--name-IDs=*",
        "--no-notdef-outline", "--notdef-outline",
    ], check=True)


def main() -> None:
    digest = source_digest()
    if STAMP.is_file() and STAMP.read_text(encoding="ascii").strip() == digest and LATIN.is_file() and any(CHINESE_DIR.glob("*.woff2")):
        print("UI fonts unchanged")
        return
    regular = CACHE / "NotoSansSC-regular.ttf"
    medium = CACHE / "NotoSansSC-medium.ttf"
    latin_source = CACHE / "GoogleSansFlex-Stella.ttf"
    for path in (regular, medium, latin_source):
        if not path.is_file():
            raise SystemExit(f"missing font source: {path}")
    subset(latin_source, LATIN, LATIN_TEXT)
    text = chinese_text()
    if CHINESE_DIR.exists():
        for old in CHINESE_DIR.glob("*.woff2"):
            old.unlink()
    ranges = [
        ("punct", "U+3000-303F"), ("kana", "U+3040-30FF"),
        ("fullwidth", "U+FF00-FFEF"), ("genpunct", "U+2010-2044"),
        ("greek", "U+0370-03FF"), ("cyrillic", "U+0400-04FF"),
        ("letterlike", "U+2100-21FF"), ("math", "U+2200-22FF"),
        ("circled", "U+2460-24FF"), ("shapes", "U+25A0-25FF"),
        ("symbols", "U+2600-27BF"), ("arrows-c", "U+2900-297F"),
        ("compat", "U+3200-32FF"),
    ]
    start = 0x4E00
    while start <= 0x9FFF:
        end = min(start + 0xFF, 0x9FFF)
        ranges.append((f"u{start:04x}", f"U+{start:04X}-{end:04X}"))
        start = end + 1
    written = 0
    for name, unicode_range in ranges:
        chunk_text = chars_in_range(text, unicode_range)
        if not chunk_text:
            continue
        output = CHINESE_DIR / f"{name}.woff2"
        subset(regular, output, chunk_text)
        if output.stat().st_size <= 512:
            output.unlink()
        else:
            written += 1
    STAMP.write_text(digest, encoding="ascii")
    print(f"UI fonts rebuilt: {len(text)} Chinese characters, {written} chunks")


if __name__ == "__main__":
    main()
