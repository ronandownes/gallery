#!/usr/bin/env python3
"""
build_gallery.py

Single-command gallery builder for E:/gallery-style folders.

What it does:
- scans book folders under the gallery root
- expects images in each book's webp/ folder
- optionally parses toc.txt (pipe-delimited)
- generates:
    - viewer.html   in each book folder
    - index.json    in each book folder
    - index.html    at gallery root
- overwrites generated files cleanly each run

Usage:
    python build_gallery.py
    python build_gallery.py --gallery E:/gallery
    python build_gallery.py am3 tt4 lca1

Expected layout:
    E:/gallery/
        build_gallery.py
        template.html
        index.html                 <- generated
        am1/
            webp/
                001.webp
                002.webp
            toc.txt                <- optional
            viewer.html            <- generated
            index.json             <- generated
        am2/
            webp/
                001.webp
"""

from __future__ import annotations

import sys
import json
import html
import re
from pathlib import Path
from typing import Iterable

DEFAULT_GALLERY_ROOT = Path(r"E:/gallery")
IMAGE_DIR_NAME = "webp"
IMG_EXTS = {".webp", ".png", ".jpg", ".jpeg"}


def natural_sort_key(s: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", s)]


def list_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMG_EXTS]
    files.sort(key=lambda p: natural_sort_key(p.name))
    return files


def find_books(gallery: Path, only: set[str] | None = None) -> list[Path]:
    books: list[Path] = []
    skip_names = {"__pycache__", ".git", ".github", "archive", "misc"}
    for entry in sorted(gallery.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_dir():
            continue
        if entry.name.startswith(".") or entry.name.lower() in skip_names:
            continue
        if only is not None and entry.name not in only:
            continue
        if list_images(entry / IMAGE_DIR_NAME):
            books.append(entry)
    return books


def find_toc_file(book_dir: Path) -> Path | None:
    preferred = book_dir / "toc.txt"
    if preferred.exists():
        return preferred
    txts = sorted(
        [p for p in book_dir.iterdir() if p.is_file() and p.suffix.lower() == ".txt"],
        key=lambda p: p.name.lower()
    )
    return txts[0] if txts else None


def safe_int(value: str | None, default: int = 1) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        return default


def parse_toc(book_dir: Path) -> dict:
    toc_file = find_toc_file(book_dir)
    if not toc_file:
        return {"chapters": []}

    chapters = []
    current_chapter = None

    for raw_line in toc_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = [p.strip() for p in line.split("|")]
        kind = parts[0].upper()

        kv = {}
        positional = []
        for p in parts[1:]:
            if "=" in p:
                k, v = p.split("=", 1)
                kv[k.strip().lower()] = v.strip()
            else:
                positional.append(p)

        if kind == "CHAPTER":
            code = positional[0] if len(positional) > 0 else ""
            title = positional[1] if len(positional) > 1 else ""
            current_chapter = {
                "code": code,
                "title": title,
                "start": safe_int(kv.get("start"), 1),
                "end": safe_int(kv.get("end"), 0),
                "sections": []
            }
            chapters.append(current_chapter)

        elif kind == "SECTION" and current_chapter is not None:
            code = positional[0] if len(positional) > 0 else ""
            title = positional[1] if len(positional) > 1 else ""
            current_chapter["sections"].append({
                "code": code,
                "title": title,
                "start": safe_int(kv.get("start"), 1),
                "end": safe_int(kv.get("end"), 0)
            })

    return {"chapters": chapters}


def read_page_offset(book_dir: Path) -> int:
    toc_file = find_toc_file(book_dir)
    if not toc_file:
        return 0

    for raw_line in toc_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.upper().startswith("OFFSET"):
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 2:
                return safe_int(parts[1], 0)
            return 0
    return 0


def build_viewer(book_dir: Path, template_html: str) -> bool:
    image_files = list_images(book_dir / IMAGE_DIR_NAME)
    if not image_files:
        print(f"SKIP {book_dir.name}: no images in {IMAGE_DIR_NAME}/")
        return False

    pages = [p.name for p in image_files]
    toc = parse_toc(book_dir)
    page_offset = read_page_offset(book_dir)

    rendered = template_html
    rendered = rendered.replace("__BOOK_NAME__", html.escape(book_dir.name))
    rendered = rendered.replace("__PAGES__", json.dumps(pages))
    rendered = rendered.replace("__IMG_BASE__", json.dumps(IMAGE_DIR_NAME))
    rendered = rendered.replace("__TOC__", json.dumps(toc))
    rendered = rendered.replace("__PAGE_OFFSET__", str(page_offset))

    (book_dir / "viewer.html").write_text(rendered, encoding="utf-8")

    index_data = {
        "book": book_dir.name,
        "pages": pages,
        "pageCount": len(pages),
        "pageOffset": page_offset,
        "hasTOC": len(toc["chapters"]) > 0,
        "tocChapters": len(toc["chapters"]),
        "imageDir": IMAGE_DIR_NAME,
    }
    (book_dir / "index.json").write_text(json.dumps(index_data, indent=2), encoding="utf-8")

    toc_name = find_toc_file(book_dir).name if find_toc_file(book_dir) else "none"
    print(f"OK   {book_dir.name}: {len(pages)} pages, {len(toc['chapters'])} chapters ({toc_name})")
    return True


def build_gallery_index(gallery: Path, books: Iterable[Path]) -> None:
    entries = []
    for book_dir in books:
        images = list_images(book_dir / IMAGE_DIR_NAME)
        if not images:
            continue

        idx_file = book_dir / "index.json"
        if idx_file.exists():
            try:
                info = json.loads(idx_file.read_text(encoding="utf-8"))
            except Exception:
                info = {
                    "book": book_dir.name,
                    "pageCount": len(images),
                    "hasTOC": False,
                    "tocChapters": 0,
                }
        else:
            info = {
                "book": book_dir.name,
                "pageCount": len(images),
                "hasTOC": False,
                "tocChapters": 0,
            }

        thumb = f"{book_dir.name}/{IMAGE_DIR_NAME}/{images[0].name}"
        entries.append({**info, "thumb": thumb})

    cards = []
    for e in entries:
        toc_label = f" · {e.get('tocChapters', 0)} ch" if e.get("hasTOC") else ""
        cards.append(f'''<div class="card">
  <a href="{html.escape(e["book"])}\viewer.html">
    <img class="card-thumb" src="{html.escape(e["thumb"])}" alt="">
    <div class="card-info">
      <div class="card-title">{html.escape(e["book"])}</div>
      <div class="card-meta">{e.get("pageCount", 0)} pages{toc_label}</div>
    </div>
  </a>
</div>'''.replace('\\','/'))

    gallery_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gallery</title>
<style>
* {{ box-sizing: border-box; }}
body {{
  margin: 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #1a1a1a;
  color: #e8e8e8;
}}
h1 {{ margin: 0 0 18px; font-size: 22px; }}
.grid {{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}}
.card {{
  background: #222;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
  transition: transform .15s, border-color .15s;
}}
.card:hover {{
  transform: translateY(-2px);
  border-color: #7f5cff;
}}
.card a {{
  color: inherit;
  text-decoration: none;
  display: block;
}}
.card-thumb {{
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
  background: #111;
}}
.card-info {{ padding: 10px; }}
.card-title {{ font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #fff; }}
.card-meta {{ font-size: 11px; color: #9f9f9f; }}
</style>
</head>
<body>
<h1>Gallery</h1>
<div class="grid">
{chr(10).join(cards)}
</div>
</body>
</html>'''
    (gallery / "index.html").write_text(gallery_html, encoding="utf-8")
    print(f"Gallery index: {len(entries)} book(s) -> index.html")


def parse_args(argv: list[str]) -> tuple[Path, set[str] | None]:
    gallery = DEFAULT_GALLERY_ROOT
    filtered: list[str] = []
    i = 0
    while i < len(argv):
        if argv[i] == "--gallery" and i + 1 < len(argv):
            gallery = Path(argv[i + 1])
            i += 2
        else:
            filtered.append(argv[i])
            i += 1
    only = set(filtered) if filtered else None
    return gallery.resolve(), only


def main() -> None:
    gallery, only = parse_args(sys.argv[1:])
    template_path = gallery / "template.html"

    if not template_path.exists():
        print(f"ERROR: template.html not found in {gallery}")
        sys.exit(1)

    template_html = template_path.read_text(encoding="utf-8")
    books = find_books(gallery, only)

    if not books:
        print(f"No valid book folders found. Expected {IMAGE_DIR_NAME}/ with at least one image.")
        sys.exit(1)

    print(f"Gallery: {gallery}")
    print(f"Found {len(books)} valid book(s)\n")

    built = 0
    for book in books:
        if build_viewer(book, template_html):
            built += 1

    build_gallery_index(gallery, books)
    print(f"\nDone: {built}/{len(books)} viewer(s) built")


if __name__ == "__main__":
    main()
