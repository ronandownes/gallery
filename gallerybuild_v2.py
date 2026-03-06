#!/usr/bin/env python3
"""
gallerybuild_v2.py  —  Build gallery viewers + a clean gallery index (skips stale/empty books).

What changed vs your original:
- A "book" is only included in the *gallery index* if it has at least 1 valid image in pages/.
  (So folders left behind from old books won't create blank thumbnails/cards.)
- The top-level gallery index is built from *valid* books only.

Usage:
    python gallerybuild_v2.py                    # default: E:/gallery
    python gallerybuild_v2.py --gallery D:/gallery
    python gallerybuild_v2.py am2 lca1           # only named books (for building viewers)
"""

import sys, json, re
from pathlib import Path

GALLERY_ROOT = Path(r"E:/gallery")
IMG_EXTS = {'.webp', '.png', '.jpg', '.jpeg'}


def natural_sort_key(s: str):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', str(s))]


def list_page_images(pages_dir: Path):
    """Return sorted list of image file Paths in pages_dir."""
    if not pages_dir.is_dir():
        return []
    files = [p for p in pages_dir.iterdir()
             if p.is_file() and p.suffix.lower() in IMG_EXTS]
    files.sort(key=lambda p: natural_sort_key(p.name))
    return files


def is_valid_book_dir(book_dir: Path) -> bool:
    """A 'valid' book is a folder containing pages/ with at least one supported image."""
    pages_dir = book_dir / 'webp'
    return len(list_page_images(pages_dir)) > 0


def find_books(gallery: Path, only=None, require_images=True):
    """
    Find book folders.
    A folder counts as a book if it contains a pages/ subdirectory.
    If require_images=True, it must also contain at least 1 image in pages/.
    """
    books = []
    for entry in sorted(gallery.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_dir():
            
            continue
        if entry.name.startswith('.') or entry.name.lower() in ('__pycache__', 'misc', 'archive'):
            continue
        if (entry / 'pages').is_dir():
            if only is not None and entry.name not in only:
                continue
            if require_images and not is_valid_book_dir(entry):
                continue
            books.append(entry)
    return books


def get_pages(book_dir: Path):
    """Get sorted list of image filenames from pages/."""
    pages_dir = book_dir / 'pages'
    return [p.name for p in list_page_images(pages_dir)]


def find_toc_file(book_dir: Path):
    """Find the TOC .txt file in a book directory. Prefers toc.txt, falls back to any .txt."""
    toc_file = book_dir / 'toc.txt'
    if toc_file.exists():
        return toc_file
    txt_files = sorted((f for f in book_dir.iterdir() if f.suffix.lower() == '.txt' and f.is_file()),
                       key=lambda p: p.name.lower())
    return txt_files[0] if txt_files else None


def parse_toc(book_dir: Path):
    """Parse pipe-delimited TOC from any .txt file into {chapters: [...]} structure."""
    toc_file = find_toc_file(book_dir)
    if not toc_file:
        return {"chapters": []}

    chapters = []
    current_chapter = None

    for line in toc_file.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        parts = [p.strip() for p in line.split('|')]
        kind = parts[0].upper()

        kv = {}
        positional = []
        for p in parts[1:]:
            if '=' in p:
                k, v = p.split('=', 1)
                kv[k.strip().lower()] = v.strip()
            else:
                positional.append(p)

        def safe_int(val, default=1):
            try:
                return int(val)
            except (ValueError, TypeError):
                return default

        if kind == 'CHAPTER':
            code = positional[0] if len(positional) > 0 else ''
            title = positional[1] if len(positional) > 1 else ''
            current_chapter = {
                "code": code,
                "title": title,
                "start": safe_int(kv.get('start'), 1),
                "end": safe_int(kv.get('end'), 0),
                "sections": []
            }
            chapters.append(current_chapter)

        elif kind == 'SECTION' and current_chapter is not None:
            code = positional[0] if len(positional) > 0 else ''
            title = positional[1] if len(positional) > 1 else ''
            current_chapter["sections"].append({
                "code": code,
                "title": title,
                "start": safe_int(kv.get('start'), 1),
                "end": safe_int(kv.get('end'), 0)
            })

    return {"chapters": chapters}


def build_viewer(book_dir: Path, template_html: str):
    """Generate viewer.html and index.json for a single book."""
    book_name = book_dir.name
    pages = get_pages(book_dir)

    if not pages:
        print(f"  SKIP {book_name}: no images in pages/")
        return False

    toc = parse_toc(book_dir)

    # Read page offset from toc file header or default to 0
    page_offset = 0
    toc_file = find_toc_file(book_dir)
    if toc_file:
        for line in toc_file.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line.upper().startswith('OFFSET'):
                parts = line.split('|')
                if len(parts) >= 2:
                    try:
                        page_offset = int(parts[1].strip())
                    except ValueError:
                        pass
                break

    # Build viewer.html from template
    html = template_html
    html = html.replace('__BOOK_NAME__', book_name)
    html = html.replace('__PAGES__', json.dumps(pages))
    html = html.replace("__IMG_BASE__", json.dumps("pages"))
    html = html.replace('__TOC__', json.dumps(toc))
    html = html.replace('__PAGE_OFFSET__', str(page_offset))

    viewer_path = book_dir / 'viewer.html'
    viewer_path.write_text(html, encoding='utf-8')

    # Build index.json
    index = {
        "book": book_name,
        "pages": pages,
        "pageCount": len(pages),
        "pageOffset": page_offset,
        "hasTOC": len(toc["chapters"]) > 0,
        "tocChapters": len(toc["chapters"])
    }
    index_path = book_dir / 'index.json'
    index_path.write_text(json.dumps(index, indent=2), encoding='utf-8')

    toc_src = find_toc_file(book_dir)
    toc_name = toc_src.name if toc_src else 'none'
    print(f"  OK   {book_name}: {len(pages)} pages, {len(toc['chapters'])} chapters ({toc_name}) → viewer.html")
    return True


def build_gallery_index(gallery: Path):
    """
    Generate gallery/index.html listing all *valid* books only
    (i.e., those with at least 1 image in pages/).
    """
    books = find_books(gallery, require_images=True)

    entries = []
    for book_dir in books:
        # index.json is optional; if missing we'll compute minimal info
        idx_file = book_dir / 'index.json'
        if idx_file.exists():
            try:
                info = json.loads(idx_file.read_text(encoding='utf-8'))
            except json.JSONDecodeError:
                info = {"book": book_dir.name, "pageCount": 0, "hasTOC": False}
        else:
            # Derive count directly so we never show blank cards
            page_files = list_page_images(book_dir / 'pages')
            info = {"book": book_dir.name, "pageCount": len(page_files), "hasTOC": False, "tocChapters": 0}

        # Thumbnail: first page image (guaranteed to exist for valid books)
        page_files = list_page_images(book_dir / 'pages')
        if not page_files:
            # Defensive: skip if something changed between discovery and now
            continue
        thumb = f"{book_dir.name}/pages/{page_files[0].name}"
        entries.append({**info, "thumb": thumb})

    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gallery</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
       background: #1a1a1a; color: #e0e0e0; padding: 24px; }
h1 { font-size: 20px; margin-bottom: 20px; color: #fff; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.card { background: #222; border: 1px solid #333; border-radius: 8px; overflow: hidden;
        cursor: pointer; transition: border-color 0.2s, transform 0.15s; }
.card:hover { border-color: #0066cc; transform: translateY(-2px); }
.card a { text-decoration: none; color: inherit; display: block; }
.card-thumb { width: 100%; aspect-ratio: 3/4; object-fit: cover; background: #111; display: block; }
.card-info { padding: 10px; }
.card-title { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px; }
.card-meta { font-size: 11px; color: #888; }
</style>
</head>
<body>
<h1>Gallery</h1>
<div class="grid">
"""
    for e in entries:
        toc_label = f" · {e.get('tocChapters', 0)} ch" if e.get('hasTOC') else ''
        html += f"""<div class="card"><a href="{e['book']}/viewer.html">
<img class="card-thumb" src="{e['thumb']}" alt="">
<div class="card-info">
<div class="card-title">{e['book']}</div>
<div class="card-meta">{e.get('pageCount', 0)} pages{toc_label}</div>
</div></a></div>
"""
    html += "</div>\n</body>\n</html>"

    index_path = gallery / 'index.html'
    index_path.write_text(html, encoding='utf-8')
    print(f"  Gallery index: {len(entries)} book(s) → index.html (skipped stale/empty folders)")


def main():
    gallery = GALLERY_ROOT
    only_books = None

    # Parse args
    args = sys.argv[1:]
    filtered = []
    i = 0
    while i < len(args):
        if args[i] == '--gallery' and i + 1 < len(args):
            gallery = Path(args[i + 1])
            i += 2
        else:
            filtered.append(args[i])
            i += 1

    if filtered:
        only_books = set(filtered)

    gallery = gallery.resolve()
    print(f"Gallery: {gallery}")

    # Load template
    template_path = gallery / 'template.html'
    if not template_path.exists():
        print(f"ERROR: template.html not found in {gallery}")
        sys.exit(1)
    template_html = template_path.read_text(encoding='utf-8')

    # Discover and build viewers (for selected books, require images so we don't rebuild junk)
    books = find_books(gallery, only_books, require_images=True)
    if not books:
        print("No valid book folders found (need pages/ with at least one image)")
        sys.exit(1)

    print(f"Found {len(books)} book(s)\n")
    ok = 0
    for book in books:
        if build_viewer(book, template_html):
            ok += 1

    # Rebuild gallery index from valid books only
    build_gallery_index(gallery)

    print(f"\nDone: {ok}/{len(books)} built")


if __name__ == '__main__':
    main()
