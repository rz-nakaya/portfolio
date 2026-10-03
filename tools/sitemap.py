#!/usr/bin/env python3
"""検索エンジン向けの sitemap.xml を生成する(Google サーチコンソールに登録する)。

ページを追加・変更したら、リポジトリ直下で次を実行するだけでよい。

    python3 tools/sitemap.py          # sitemap.xml を生成・更新
    python3 tools/sitemap.py --check  # 未反映なら終了コード1(CI用)

- 対象: リポジトリ内のすべての index.html(隠しフォルダ・404.html は対象外)
- noindex のページ(架空LP・改善事例など)は検索に載せない方針なので含めない
- lastmod: そのページを最後にコミットした日付(未コミットなら今日)
"""
import argparse
import datetime
import re
import subprocess
import sys
from pathlib import Path

BASE_URL = "https://rz-nakaya.github.io/portfolio/"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sitemap.xml"
NOINDEX_RE = re.compile(r'<meta name="robots" content="[^"]*noindex', re.I)


def find_pages():
    pages = sorted(ROOT.rglob("index.html"), key=lambda p: (len(p.parts), p.as_posix()))
    return [p for p in pages if not any(part.startswith(".") for part in p.relative_to(ROOT).parts)]


def last_modified(page):
    rel = page.relative_to(ROOT).as_posix()
    dirty = subprocess.run(["git", "status", "--porcelain", "--", rel], cwd=ROOT, capture_output=True, text=True).stdout
    if not dirty:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if out:
            return out
    return datetime.date.today().isoformat()


def build():
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page in find_pages():
        if NOINDEX_RE.search(page.read_text(encoding="utf-8")):
            continue
        rel_dir = page.parent.relative_to(ROOT).as_posix()
        url = BASE_URL + ("" if rel_dir == "." else f"{rel_dir}/")
        lines.append(f"  <url><loc>{url}</loc><lastmod>{last_modified(page)}</lastmod></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="書き換えずに未反映かどうかだけ確認する")
    args = parser.parse_args()

    new = build()
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if args.check:
        if new != old:
            print("sitemap.xml が未反映です。`python3 tools/sitemap.py` を実行してください")
            return 1
        print("sitemap.xml: 反映済み")
        return 0
    if new == old:
        print("sitemap.xml: 変更なし")
    else:
        OUT.write_text(new, encoding="utf-8")
        print(f"sitemap.xml: 更新({new.count('<url>')}ページ)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
