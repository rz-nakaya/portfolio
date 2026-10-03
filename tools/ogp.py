#!/usr/bin/env python3
"""全ページの<head>にOGP/Twitterカードのタグを挿入・更新する。

ページを追加・変更したら、リポジトリ直下で次を実行するだけでよい。

    python3 tools/ogp.py          # タグとOGP画像を生成・更新
    python3 tools/ogp.py --check  # 未反映のページがあれば終了コード1(CI用)

- 対象: リポジトリ内のすべての index.html(隠しフォルダ・404.html は対象外)
- og:title / og:description: 各ページの <title> と <meta name="description"> から取得
- og:image: 実績一覧ページ(lp/・website/)のカードで `../<フォルダ>/` にリンクしている
  Web版スクリーンショット(*-web.jpg)を 1200x630 に切り出して assets/ogp/<フォルダ>.jpg に保存。
  作品の下層ページ(corporate-site/company/ 等)は作品と同じ画像を使う。
  該当が無いページ(トップ・一覧・about等)は assets/ogp/default.jpg(実績のコラージュ)を使う
- タグは <!-- OGP:BEGIN --> 〜 <!-- OGP:END --> の間に書き込むため、何度実行しても重複しない
"""
import argparse
import html
import re
import sys
from pathlib import Path

BASE_URL = "https://rz-nakaya.github.io/portfolio/"
SITE_NAME = "PORTFOLIO"
OG_W, OG_H = 1200, 630

ROOT = Path(__file__).resolve().parent.parent
OGP_DIR = ROOT / "assets" / "ogp"
BEGIN = "<!-- OGP:BEGIN (tools/ogp.py で自動生成。手で編集しない) -->"
END = "<!-- OGP:END -->"
BLOCK_RE = re.compile(r"[ \t]*<!-- OGP:BEGIN.*?<!-- OGP:END -->\n?", re.S)


LIST_PAGES = ["lp/index.html", "website/index.html"]


def find_pages():
    pages = sorted(ROOT.rglob("index.html"), key=lambda p: (len(p.parts), p.as_posix()))
    return [p for p in pages if not any(part.startswith(".") for part in p.relative_to(ROOT).parts)]


def page_slug(page):
    """作品のフォルダ名(下層ページなら最上位のフォルダ名)。トップは空文字。"""
    parts = page.parent.relative_to(ROOT).parts
    return parts[0] if parts else ""


def screenshot_map():
    """実績一覧ページのカードから {フォルダ名: Web版スクショのパス} を作る。"""
    shots = {}
    for rel in LIST_PAGES:
        page = ROOT / rel
        if not page.exists():
            continue
        text = page.read_text(encoding="utf-8")
        pairs = re.findall(r'<a href="\.\./([^/"]+)/"><img src="\.\./(assets/screenshots/[^"]+-web\.jpg)"', text)
        shots.update({slug: ROOT / src for slug, src in pairs})
    return shots


def crop_to_ogp(src, dst):
    from PIL import Image

    with Image.open(src) as im:
        im = im.convert("RGB")
        scale = OG_W / im.width
        im = im.resize((OG_W, round(im.height * scale)), Image.LANCZOS)
        im.crop((0, 0, OG_W, OG_H)).save(dst, "JPEG", quality=85, optimize=True)


def make_collage(srcs, dst):
    """実績スクショ(最大4枚)を2x2に並べたサイト共通画像。"""
    from PIL import Image

    canvas = Image.new("RGB", (OG_W, OG_H), (245, 243, 238))
    gap = 16
    cw, ch = (OG_W - gap * 3) // 2, (OG_H - gap * 3) // 2
    for i, src in enumerate(srcs[:4]):
        with Image.open(src) as im:
            im = im.convert("RGB")
            scale = cw / im.width
            im = im.resize((cw, round(im.height * scale)), Image.LANCZOS).crop((0, 0, cw, ch))
            canvas.paste(im, (gap + (i % 2) * (cw + gap), gap + (i // 2) * (ch + gap)))
    canvas.save(dst, "JPEG", quality=85, optimize=True)


def build_images(shots, force):
    """必要なOGP画像を生成し、{フォルダ名: 画像パス} を返す(default含む)。"""
    OGP_DIR.mkdir(parents=True, exist_ok=True)
    images = {}
    for slug, src in shots.items():
        if not src.exists():
            continue
        dst = OGP_DIR / f"{slug}.jpg"
        if force or not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            crop_to_ogp(src, dst)
            print(f"  画像生成: {dst.relative_to(ROOT)}")
        images[slug] = dst
    default = OGP_DIR / "default.jpg"
    if force or not default.exists():
        make_collage([s for s in shots.values() if s.exists()], default)
        print(f"  画像生成: {default.relative_to(ROOT)}")
    images[""] = default
    return images


def page_meta(text):
    title = re.search(r"<title>(.*?)</title>", text, re.S)
    desc = re.search(r'<meta name="description" content="(.*?)">', text, re.S)
    return (html.unescape(title.group(1).strip()) if title else SITE_NAME,
            html.unescape(desc.group(1).strip()) if desc else "")


def render_block(page, text, image):
    rel_dir = page.parent.relative_to(ROOT).as_posix()
    url = BASE_URL + ("" if rel_dir == "." else f"{rel_dir}/")
    image_url = BASE_URL + image.relative_to(ROOT).as_posix()
    title, desc = page_meta(text)
    e = lambda s: html.escape(s, quote=True)
    lines = [
        BEGIN,
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{e(SITE_NAME)}">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{e(url)}">',
        f'<meta property="og:image" content="{e(image_url)}">',
        f'<meta property="og:image:width" content="{OG_W}">',
        f'<meta property="og:image:height" content="{OG_H}">',
        '<meta property="og:locale" content="ja_JP">',
        '<meta name="twitter:card" content="summary_large_image">',
        END,
    ]
    return "\n".join(lines) + "\n"


def apply_block(text, block):
    if BLOCK_RE.search(text):
        return BLOCK_RE.sub(lambda _: block, text, count=1)
    # description の直後(無ければ </title> の直後、それも無ければ </head> の直前)に挿入
    for pattern in (r'<meta name="description"[^>]*>\n', r"</title>\n"):
        m = re.search(pattern, text)
        if m:
            return text[: m.end()] + block + text[m.end():]
    return text.replace("</head>", block + "</head>", 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="書き換えずに未反映ページの有無だけ確認する")
    parser.add_argument("--force", action="store_true", help="OGP画像を全て作り直す")
    args = parser.parse_args()

    shots = screenshot_map()
    if args.check:
        images = {slug: OGP_DIR / f"{slug}.jpg" for slug in shots}
        images[""] = OGP_DIR / "default.jpg"
    else:
        images = build_images(shots, args.force)

    stale = []
    for page in find_pages():
        image = images.get(page_slug(page)) or images[""]
        if not args.check and not image.exists():
            image = images[""]
        text = page.read_text(encoding="utf-8")
        new = apply_block(text, render_block(page, text, image))
        rel = page.relative_to(ROOT).as_posix()
        if new != text or not image.exists():
            stale.append(rel)
            if not args.check:
                page.write_text(new, encoding="utf-8")
                print(f"  更新: {rel}")

    if args.check:
        if stale:
            print("OGPが未反映です。`python3 tools/ogp.py` を実行してください:")
            print("\n".join(f"  - {s}" for s in stale))
            return 1
        print("OGP: 全ページ反映済み")
    elif not stale:
        print("OGP: 変更なし(全ページ反映済み)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
