"""Regenerate the Noto chunk declarations from the files produced by subsetting."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHUNK_DIR = ROOT / "src" / "fonts" / "noto"
OUTPUT = ROOT / "src" / "ui-font.css"


CHUNK_RANGES = {
    "punct": "U+3000-303F",
    "kana": "U+3040-30FF",
    "fullwidth": "U+FF00-FFEF",
    "genpunct": "U+2010-2044",
    "greek": "U+0370-03FF",
    "cyrillic": "U+0400-04FF",
    "letterlike": "U+2100-21FF",
    "math": "U+2200-22FF",
    "circled": "U+2460-24FF",
    "shapes": "U+25A0-25FF",
    "symbols": "U+2600-27BF",
    "arrows-c": "U+2900-297F",
    "compat": "U+3200-32FF",
}


def unicode_range(name: str) -> str:
    if name in CHUNK_RANGES:
        return CHUNK_RANGES[name]
    start = int(name[1:], 16)
    return f"U+{start:04X}-{min(start + 0xFF, 0x9FFF):04X}"


def main() -> None:
    chunks = sorted(CHUNK_DIR.glob("*.woff2"))
    rules = ["""/* 主站字体。Google Sans Flex 负责拉丁字符，Noto Sans SC 按 Unicode 区段分片。
   浏览器只下载页面实际用到的片段。两套字体都使用 SIL OFL 1.1。 */
@font-face {
  font-family: "Stella UI";
  src: url("./fonts/google-sans-ui.woff2") format("woff2");
  font-weight: 400 560;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0020-007E, U+00A0-00FF;
}
"""]
    for path in chunks:
        rules.append(f"""@font-face {{
  font-family: "Stella UI";
  src: url("./fonts/noto/{path.name}") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: {unicode_range(path.stem)};
}}
""")
    OUTPUT.write_text("".join(rules), encoding="utf-8")
    print(f"ui-font.css: {len(chunks)} Chinese chunks")


if __name__ == "__main__":
    main()
