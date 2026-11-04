#!/usr/bin/env python3
"""Build the GitHub Pages artifact: copy only what the live site needs into an output folder.

Nothing in the repository is deleted or moved. Files left out stay in git; they are just not published.

Left out of the published site:
  - development folders: planning/, reports/, tools/, .github/
  - Windows helper scripts at the root (*.bat)
  - data/runtime-data.js (only read and written by tools/, never loaded by the site)
  - assets/test-media/stage-maps/ (PNG originals; the site uses stage-maps-webp/)
  - older desktop-tool downloads: each tool keeps its newest KEEP_RECENT versions, and any file
    named by a download manifest is always kept

Usage:
  python3 tools/build_pages_site.py                 # dry run: print what would be published
  python3 tools/build_pages_site.py --out _site     # build the folder
  python3 tools/build_pages_site.py --out _site --check   # build, then verify key references
"""
import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEEP_RECENT = 3

EXCLUDED_DIRS = {'.git', '.github', 'planning', 'reports', 'tools', 'tmp', '_site', 'node_modules', 'outputs'}
EXCLUDED_PREFIXES = ('assets/test-media/stage-maps/',)
EXCLUDED_FILES = {'data/runtime-data.js'}
EXCLUDED_SUFFIXES_AT_ROOT = ('.bat',)

# Download families: (pattern on the path relative to the repo, sort key from the match).
# Files matching no family are always published.
DOWNLOAD_FAMILIES = {
    'wuguan': (re.compile(r'^downloads/Wuguan_(\d{6})-(\d+)\.zip$'), lambda m: (int(m.group(1)), int(m.group(2)))),
    'wuguan-demo': (re.compile(r'^downloads/(?:Wuguan|武冠判讀)_DEMO_.+\.zip$'), None),  # superseded test builds
    'launcher': (re.compile(r'^downloads/SZOnline_Launcher_ByNikoko_(\d+)\.(\d+)\.(\d+)\.7z$'), lambda m: tuple(int(g) for g in m.groups())),
    'appearance': (re.compile(r'^downloads/appearance-changer/SZOAppearance-v(\d+)\.(\d+)\.(\d+)\.zip$'), lambda m: tuple(int(g) for g in m.groups())),
}

DOWNLOAD_MANIFESTS = [
    'downloads/version.json',
    'downloads/szo-launcher-version.json',
    'downloads/szo-launcher-version.ini',
    'downloads/collectbook-version.json',
    'downloads/appearance-changer/latest.json',
]
SITE_PREFIX = 'https://leonmax78.github.io/'


def all_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel_dir = Path(dirpath).relative_to(ROOT).as_posix()
        dirnames[:] = sorted(d for d in dirnames if not (rel_dir == '.' and d in EXCLUDED_DIRS) and d != '__pycache__')
        for name in sorted(filenames):
            rel = (Path(rel_dir) / name).as_posix() if rel_dir != '.' else name
            yield rel


def manifest_targets():
    """Paths named by the desktop-tool download manifests; these are always published."""
    targets = set()
    for rel in DOWNLOAD_MANIFESTS:
        path = ROOT / rel
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8', errors='replace')
        for url in re.findall(r'https://leonmax78\.github\.io/[^\s"\'?]+', text):
            targets.add(url[len(SITE_PREFIX):])
        try:
            data = json.loads(text)
        except ValueError:
            continue
        name = data.get('file_name')
        if name:
            targets.add((Path(rel).parent / name).as_posix())
    return targets


def plan():
    files = list(all_files())
    keep_always = manifest_targets()
    excluded = {}
    families = {}
    for rel in files:
        if rel in EXCLUDED_FILES or rel.startswith(EXCLUDED_PREFIXES) or ('/' not in rel and rel.endswith(EXCLUDED_SUFFIXES_AT_ROOT)):
            excluded[rel] = 'development or source file'
            continue
        for fam, (pattern, key) in DOWNLOAD_FAMILIES.items():
            m = pattern.match(rel)
            if m:
                families.setdefault(fam, []).append((key(m) if key else None, rel))
                break
    for fam, rows in families.items():
        if DOWNLOAD_FAMILIES[fam][1] is None:
            drop = [rel for _, rel in rows]
        else:
            rows.sort(reverse=True)
            drop = [rel for _, rel in rows[KEEP_RECENT:]]
        for rel in drop:
            if rel not in keep_always:
                excluded[rel] = f'older {fam} download'
    published = [rel for rel in files if rel not in excluded]
    return published, excluded, keep_always


def size(rels):
    return sum((ROOT / rel).stat().st_size for rel in rels)


def build(out, published):
    out = Path(out).resolve()
    if out == ROOT or ROOT in out.parents and out.name not in EXCLUDED_DIRS:
        sys.exit(f'refusing to write to {out}: use a folder such as _site')
    if out.exists():
        shutil.rmtree(out)
    for rel in published:
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.link(ROOT / rel, dest)
        except OSError:
            shutil.copy2(ROOT / rel, dest)
    return out


def check(out, keep_always):
    out = Path(out)
    problems = []
    for rel in ['index.html', '.nojekyll', 'js/shell.js', 'js/script-manifest.js', 'js/script-loader.js']:
        if not (out / rel).exists():
            problems.append(f'missing {rel}')
    manifest = (ROOT / 'js/script-manifest.js').read_text(encoding='utf-8')
    for rel in re.findall(r'"((?:js|data)/[^"]+\.js)"', manifest):
        if not (out / rel).exists():
            problems.append(f'script-manifest.js lists a missing file: {rel}')
    for rel in sorted(keep_always):
        if (ROOT / rel).exists() and not (out / rel).exists():
            problems.append(f'download named by a manifest is missing: {rel}')
    stage_maps = json.loads((ROOT / 'data/stage_maps.json').read_text(encoding='utf-8'))
    for stage in stage_maps.get('stages', []):
        image = stage.get('image')
        if image and not (out / image).exists():
            problems.append(f'stage {stage.get("stageId")} image missing: {image}')
    return problems


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', help='output folder (omit for a dry run)')
    ap.add_argument('--check', action='store_true', help='verify key references after building')
    ap.add_argument('--list-excluded', action='store_true', help='print every excluded file')
    args = ap.parse_args()

    published, excluded, keep_always = plan()
    print(f'published: {len(published)} files, {size(published) / 1e6:,.1f} MB')
    print(f'left out:  {len(excluded)} files, {size(excluded) / 1e6:,.1f} MB')
    reasons = {}
    for rel, why in excluded.items():
        n, b = reasons.get(why, (0, 0))
        reasons[why] = (n + 1, b + (ROOT / rel).stat().st_size)
    for why, (n, b) in sorted(reasons.items(), key=lambda kv: -kv[1][1]):
        print(f'  - {why}: {n} files, {b / 1e6:,.1f} MB')
    if args.list_excluded:
        for rel in sorted(excluded):
            print(f'    {rel}')
    if not args.out:
        return
    out = build(args.out, published)
    print(f'built {out}')
    if args.check:
        problems = check(out, keep_always)
        if problems:
            print('CHECK FAILED:')
            for p in problems[:50]:
                print('  ' + p)
            sys.exit(1)
        print('check passed')


if __name__ == '__main__':
    main()
