#!/usr/bin/env python3
from pathlib import Path
import sys, json, html, re

DEFAULT_GALLERY_ROOT = Path(r"E:/gallery")
IMAGE_DIR_NAME = "webp"
IMG_EXTS = {".webp", ".png", ".jpg", ".jpeg"}

def natural_sort_key(s):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r'(\d+)', s)]

def list_images(folder):
    if not folder.is_dir():
        return []
    files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMG_EXTS]
    files.sort(key=lambda p: natural_sort_key(p.name))
    return files

def find_books(gallery, only=None):
    books = []
    skip = {"__pycache__", ".git", ".github", "archive", "misc"}
    for entry in sorted(gallery.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_dir():
            continue
        if entry.name.startswith('.') or entry.name.lower() in skip:
            continue
        if only is not None and entry.name not in only:
            continue
        if list_images(entry / IMAGE_DIR_NAME):
            books.append(entry)
    return books

def find_toc_file(book_dir):
    preferred = book_dir / 'toc.txt'
    if preferred.exists():
        return preferred
    txts = sorted([p for p in book_dir.iterdir() if p.is_file() and p.suffix.lower() == '.txt'], key=lambda p: p.name.lower())
    return txts[0] if txts else None

def safe_int(value, default=1):
    try:
        return int(str(value).strip())
    except Exception:
        return default

def parse_toc(book_dir):
    toc_file = find_toc_file(book_dir)
    if not toc_file:
        return {"chapters": []}
    chapters, current = [], None
    for raw in toc_file.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        parts = [p.strip() for p in line.split('|')]
        kind = parts[0].upper()
        kv, positional = {}, []
        for p in parts[1:]:
            if '=' in p:
                k, v = p.split('=', 1)
                kv[k.strip().lower()] = v.strip()
            else:
                positional.append(p)
        if kind == 'CHAPTER':
            current = {
                'code': positional[0] if len(positional) > 0 else '',
                'title': positional[1] if len(positional) > 1 else '',
                'start': safe_int(kv.get('start'), 1),
                'end': safe_int(kv.get('end'), 0),
                'sections': []
            }
            chapters.append(current)
        elif kind == 'SECTION' and current is not None:
            current['sections'].append({
                'code': positional[0] if len(positional) > 0 else '',
                'title': positional[1] if len(positional) > 1 else '',
                'start': safe_int(kv.get('start'), 1),
                'end': safe_int(kv.get('end'), 0)
            })
    return {'chapters': chapters}

def read_page_offset(book_dir):
    toc_file = find_toc_file(book_dir)
    if not toc_file:
        return 0
    for raw in toc_file.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if line.upper().startswith('OFFSET'):
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 2:
                return safe_int(parts[1], 0)
    return 0

def build_viewer(book_dir, template_html):
    images = list_images(book_dir / IMAGE_DIR_NAME)
    if not images:
        print(f"SKIP {book_dir.name}: no images")
        return False
    pages = [p.name for p in images]
    toc = parse_toc(book_dir)
    page_offset = read_page_offset(book_dir)
    rendered = (template_html
        .replace('__BOOK_NAME__', html.escape(book_dir.name))
        .replace('__PAGES__', json.dumps(pages))
        .replace('__IMG_BASE__', json.dumps(IMAGE_DIR_NAME))
        .replace('__TOC__', json.dumps(toc))
        .replace('__PAGE_OFFSET__', str(page_offset)))
    (book_dir / 'viewer.html').write_text(rendered, encoding='utf-8')
    idx = {
        'book': book_dir.name,
        'pages': pages,
        'pageCount': len(pages),
        'pageOffset': page_offset,
        'hasTOC': len(toc['chapters']) > 0,
        'tocChapters': len(toc['chapters']),
        'imageDir': IMAGE_DIR_NAME
    }
    (book_dir / 'index.json').write_text(json.dumps(idx, indent=2), encoding='utf-8')
    print(f"OK   {book_dir.name}: {len(pages)} pages")
    return True

def build_gallery_index(gallery, books):
    cards = []
    for book_dir in books:
        images = list_images(book_dir / IMAGE_DIR_NAME)
        if not images:
            continue
        idx_file = book_dir / 'index.json'
        try:
            info = json.loads(idx_file.read_text(encoding='utf-8')) if idx_file.exists() else {}
        except Exception:
            info = {}
        page_count = info.get('pageCount', len(images))
        toc_label = f" · {info.get('tocChapters', 0)} ch" if info.get('hasTOC') else ''
        href = f"{book_dir.name}/viewer.html"
        thumb = f"{book_dir.name}/{IMAGE_DIR_NAME}/{images[0].name}"
        cards.append(f'''<div class="card"><a href="{html.escape(href)}"><img class="card-thumb" src="{html.escape(thumb)}" alt=""><div class="card-info"><div class="card-title">{html.escape(book_dir.name)}</div><div class="card-meta">{page_count} pages{toc_label}</div></div></a></div>''')
    out = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Gallery</title><style>*{{box-sizing:border-box}}body{{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#1a1a1a;color:#e8e8e8}}h1{{margin:0 0 18px;font-size:22px}}.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}}.card{{background:#222;border:1px solid #333;border-radius:10px;overflow:hidden;transition:transform .15s,border-color .15s}}.card:hover{{transform:translateY(-2px);border-color:#7f5cff}}.card a{{color:inherit;text-decoration:none;display:block}}.card-thumb{{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#111}}.card-info{{padding:10px}}.card-title{{font-size:14px;font-weight:700;margin-bottom:4px;color:#fff}}.card-meta{{font-size:11px;color:#9f9f9f}}</style></head><body><h1>Gallery</h1><div class="grid">{''.join(cards)}</div></body></html>'''
    (gallery / 'index.html').write_text(out, encoding='utf-8')
    print(f"Gallery index: {len(cards)} books")

def parse_args(argv):
    gallery = DEFAULT_GALLERY_ROOT
    filtered = []
    i = 0
    while i < len(argv):
        if argv[i] == '--gallery' and i + 1 < len(argv):
            gallery = Path(argv[i+1]); i += 2
        else:
            filtered.append(argv[i]); i += 1
    return gallery.resolve(), (set(filtered) if filtered else None)

def main():
    gallery, only = parse_args(sys.argv[1:])
    template_path = gallery / 'template.html'
    if not template_path.exists():
        print(f"ERROR: template.html not found in {gallery}")
        sys.exit(1)
    template_html = template_path.read_text(encoding='utf-8')
    books = find_books(gallery, only)
    if not books:
        print('No valid book folders found.')
        sys.exit(1)
    print(f"Gallery: {gallery}\nFound {len(books)} valid book(s)\n")
    built = 0
    for book in books:
        if build_viewer(book, template_html):
            built += 1
    build_gallery_index(gallery, books)
    print(f"\nDone: {built}/{len(books)} viewer(s) built")

if __name__ == '__main__':
    main()
