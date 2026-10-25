"""Prepare V4 level 00 (workshop) runtime art at 2x the in-game pixel size.

Run from the repo root:
  python scripts/prepare-v4-workshop.py [--art-root <folder that holds story-v4-art-v1 and -v2>]

The art folders are untracked. Default: assets/prologue of this checkout. A git worktree does not
have them, so pass the main checkout's assets/prologue there.

Reads only:
  <art-root>/story-v4-art-v2/workshop/      background, dock lights, bench, tray, customer lamp,
                                            panel, boatman walk (pass 2, already at 2x)
  <art-root>/story-v4-art-v1/workshop/      mother and boatman standing poses (pass 1, sheets)
  <art-root>/story-v4-art-v1/illustrations/ 01..05 (pass 1)
  assets/character/nhinh_up_idle_0.png      measures Nhinh's visible height
Writes:
  assets/levels/00-workshop/sprites/        sprites, workshop-bg.png, dock-lights-on/off.png
  assets/levels/00-workshop/illustrations/  01..05 at 1280x720
  assets/levels/00-workshop/asset-map.json  source paths are relative to the art root

Pass-2 props are already at 2x, so they are not resized. Each state family (the three lamps, the
three panels) shares one foot line: every canvas in the family is cut to the family's lowest visible
row, so the foot sits on the bottom edge and bottom-centre anchoring holds for every state.

Pass-1 sheets are cut by connected components (alpha > 24), each assigned to the grid cell that
contains its centre. A plain grid crop would clip sprites whose pixels cross cell boundaries.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NHINH = ROOT / 'assets' / 'character' / 'nhinh_up_idle_0.png'
OUT = ROOT / 'assets' / 'levels' / '00-workshop'
OUT_SPR = OUT / 'sprites'
OUT_ILL = OUT / 'illustrations'
MAP_PATH = OUT / 'asset-map.json'

ALPHA_MIN = 24      # alpha must be greater than this to count as visible
SPECK_MIN = 20      # components smaller than this many pixels are ignored
GAME_SCALE = 2      # runtime art is 2x the in-game pixel size (game draws at 0.5)
BG_SIZE = (1280, 720)
WALK_FRAMES = 3     # boatman-walk-south.png is three cells side by side

ART_ROOT = ROOT / 'assets' / 'prologue'


def rel(path):
    """A source path relative to the art root, as the asset map records it."""
    return path.relative_to(ART_ROOT).as_posix()


def visible_bbox(img):
    return img.split()[3].point(lambda a: 255 if a > ALPHA_MIN else 0).getbbox()


def alpha_bottom(img):
    """The lowest visible row (exclusive), or 0 for an empty canvas."""
    box = visible_bbox(img)
    return box[3] if box else 0


def components(img):
    """8-connected components of visible pixels. Returns [(bbox, pixel_count)] in scan order."""
    w, h = img.size
    data = img.split()[3].point(lambda a: 255 if a > ALPHA_MIN else 0).tobytes()
    seen = bytearray(w * h)
    out = []
    for start in range(w * h):
        if not data[start] or seen[start]:
            continue
        seen[start] = 1
        stack = [start]
        x0 = x1 = start % w
        y0 = y1 = start // w
        count = 0
        while stack:
            p = stack.pop()
            count += 1
            y, x = divmod(p, w)
            if x < x0:
                x0 = x
            elif x > x1:
                x1 = x
            if y < y0:
                y0 = y
            elif y > y1:
                y1 = y
            for ny in (y - 1, y, y + 1):
                if not 0 <= ny < h:
                    continue
                for nx in (x - 1, x, x + 1):
                    if 0 <= nx < w:
                        q = ny * w + nx
                        if data[q] and not seen[q]:
                            seen[q] = 1
                            stack.append(q)
        out.append(((x0, y0, x1 + 1, y1 + 1), count))
    return out


def cut_sheet(path, cols, rows):
    """Return {cell_index: (sprite_image, sheet_bbox)} with one sprite per grid cell."""
    with Image.open(path) as src:
        sheet = src.convert('RGBA')
    w, h = sheet.size
    by_cell = {}
    for bbox, count in components(sheet):
        if count < SPECK_MIN:
            continue
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        col = min(int(cx * cols // w), cols - 1)
        row = min(int(cy * rows // h), rows - 1)
        by_cell.setdefault(row * cols + col, []).append(bbox)
    expected = set(range(cols * rows))
    if set(by_cell) != expected or any(len(v) != 1 for v in by_cell.values()):
        raise SystemExit(f'{rel(path)}: expected one sprite per cell, got {sorted((k, len(v)) for k, v in by_cell.items())}')
    cells = {}
    for idx, (bbox,) in by_cell.items():
        cells[idx] = (sheet.crop(bbox), bbox)
    # Sprites must not overlap each other on the sheet, or one would bleed into another.
    boxes = [b for _, b in cells.values()]
    for i, a in enumerate(boxes):
        for b in boxes[i + 1:]:
            if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                raise SystemExit(f'{rel(path)}: sprite bboxes overlap {a} {b}')
    return cells, (w, h)


def fit(img, width=None, height=None):
    """Scale a trimmed sprite to a target width or height (LANCZOS, aspect kept)."""
    if height is not None:
        w = round(img.width * height / img.height)
        h = height
    else:
        w = width
        h = round(img.height * width / img.width)
    return img.resize((w, h), Image.LANCZOS)


def write(assets, summary, out_dir, name, img, source, kind, anchor, cell=None):
    """Saves one output PNG and records it in the asset map."""
    img.save(out_dir / name)
    key = f'{out_dir.name}/{name}'
    assets[key] = {
        'kind': kind,
        'source': rel(source),
        'source_cell': cell,
        'output_size': list(img.size),
        'in_game_size': [img.width / GAME_SCALE, img.height / GAME_SCALE],
        'anchor': anchor,
    }
    summary.append((key, img.size))


def export_family(assets, summary, members):
    """members: [(output name, source path)]. Every canvas is cut to the family's lowest visible row."""
    loaded = []
    for name, src in members:
        with Image.open(src) as im:
            loaded.append((name, src, im.convert('RGBA')))
    bottom = max(alpha_bottom(img) for _, _, img in loaded)
    for name, src, img in loaded:
        if img.size[1] < bottom:
            raise SystemExit(f'{rel(src)}: canvas {img.size} is shorter than the family foot {bottom}')
        out = img.crop((0, 0, img.width, bottom))
        write(assets, summary, OUT_SPR, f'{name}.png', out, src, 'sprite', 'bottom-center')


def export_walk(assets, summary, src):
    """Splits the three-cell walk strip into one sprite per frame, all cut to the same foot line."""
    with Image.open(src) as im:
        strip = im.convert('RGBA')
    if strip.width % WALK_FRAMES:
        raise SystemExit(f'{rel(src)}: width {strip.width} is not {WALK_FRAMES} equal cells')
    cell_w = strip.width // WALK_FRAMES
    cells = [strip.crop((i * cell_w, 0, (i + 1) * cell_w, strip.height)) for i in range(WALK_FRAMES)]
    for i, cell in enumerate(cells):
        if alpha_bottom(cell) == 0:
            raise SystemExit(f'{rel(src)}: walk cell {i} is empty')
    bottom = max(alpha_bottom(cell) for cell in cells)
    for i, cell in enumerate(cells):
        out = cell.crop((0, 0, cell.width, bottom))
        write(assets, summary, OUT_SPR, f'boatman-walk-{i}.png', out, src, 'sprite', 'bottom-center', cell=i)


def main():
    global ART_ROOT
    parser = argparse.ArgumentParser(description='Prepare V4 level 00 runtime art.')
    parser.add_argument('--art-root', type=Path, default=ART_ROOT,
                        help='folder that holds story-v4-art-v1 and story-v4-art-v2 (default: assets/prologue)')
    args = parser.parse_args()
    ART_ROOT = args.art_root.resolve()

    art_v1 = ART_ROOT / 'story-v4-art-v1'
    ws_v1 = art_v1 / 'workshop'
    ill_v1 = art_v1 / 'illustrations'
    ws_v2 = ART_ROOT / 'story-v4-art-v2' / 'workshop'
    OUT_SPR.mkdir(parents=True, exist_ok=True)
    OUT_ILL.mkdir(parents=True, exist_ok=True)

    with Image.open(NHINH) as nh:
        nhinh_bbox = visible_bbox(nh.convert('RGBA'))
    nhinh_h = nhinh_bbox[3] - nhinh_bbox[1]
    mother_h = nhinh_h + 2     # in-game visible height, plan value 30
    boatman_h = nhinh_h + 1    # in-game visible height, plan value 29

    assets = {}
    summary = []

    # Background and dock lights, 1280x720 at source size (the game draws them at half size).
    bg_src = ws_v2 / '01-background.png'
    with Image.open(bg_src) as bg:
        bg_out = bg.convert('RGBA')
    if bg_out.size != BG_SIZE:
        raise SystemExit(f'{rel(bg_src)}: expected {BG_SIZE}, got {bg_out.size}')
    write(assets, summary, OUT_SPR, 'workshop-bg.png', bg_out, bg_src, 'background', 'top-left')
    for state in ('on', 'off'):
        src = ws_v2 / f'02-dock-lights-{state}.png'
        with Image.open(src) as im:
            layer = im.convert('RGBA')
        if layer.size != BG_SIZE:
            raise SystemExit(f'{rel(src)}: expected {BG_SIZE}, got {layer.size}')
        write(assets, summary, OUT_SPR, f'dock-lights-{state}.png', layer, src, 'overlay', 'top-left')

    # Repair props, pass 2. Each family shares one foot line.
    export_family(assets, summary, [('bench', ws_v2 / '03-bench.png')])
    export_family(assets, summary, [('parts-tray', ws_v2 / '04-parts-tray.png')])
    export_family(assets, summary, [
        ('customer-lamp-open', ws_v2 / '05-customer-lamp-open.png'),
        ('customer-lamp-closed', ws_v2 / '05-customer-lamp-closed.png'),
        ('customer-lamp-lit', ws_v2 / '05-customer-lamp-lit.png'),
    ])
    export_family(assets, summary, [
        ('panel-loose', ws_v2 / '06-panel-loose.png'),
        ('panel-fault', ws_v2 / '06-panel-fault.png'),
        ('panel-off', ws_v2 / '06-panel-off.png'),
    ])

    # Boatman walking south, pass 2.
    export_walk(assets, summary, ws_v2 / '07-boatman-walk-south.png')

    # Characters, pass 1, 2x2 row-major.
    chars = [
        ('02-mother-poses.png', ['mother-front.png', 'mother-back.png', 'mother-map.png', 'mother-work.png'], mother_h),
        ('03-boatman-poses.png', ['boatman-front.png', 'boatman-back.png', 'boatman-lamp.png'], boatman_h),
    ]
    for sheet_name, names, in_game_h in chars:
        src = ws_v1 / sheet_name
        cells, _ = cut_sheet(src, 2, 2)
        for cell, name in enumerate(names):
            sprite, _ = cells[cell]
            out = fit(sprite, height=in_game_h * GAME_SCALE)
            write(assets, summary, OUT_SPR, name, out, src, 'sprite', 'bottom-center', cell=cell)

    # Illustrations, pass 1, 1280x720 RGB.
    illus = [
        '01-ben-suong.png',
        '02-leaving-ben-suong.png',
        '03-maintenance-station.png',
        '04-waiting-for-morning.png',
        '05-morning-without-dawn.png',
    ]
    for name in illus:
        src = ill_v1 / name
        with Image.open(src) as im:
            out = im.convert('RGB').resize(BG_SIZE, Image.LANCZOS)
        out.save(OUT_ILL / name)
        assets[f'illustrations/{name}'] = {
            'kind': 'illustration',
            'source': rel(src),
            'source_cell': None,
            'output_size': list(BG_SIZE),
            'in_game_size': [BG_SIZE[0] / GAME_SCALE, BG_SIZE[1] / GAME_SCALE],
            'anchor': 'top-left',
        }
        summary.append((f'illustrations/{name}', BG_SIZE))

    asset_map = {
        'scale': GAME_SCALE,
        'source_root_note': 'source paths are relative to the art root (assets/prologue of the checkout that holds the untracked art)',
        'nhinh_visible_height': nhinh_h,
        'assets': dict(sorted(assets.items())),
    }
    MAP_PATH.write_text(json.dumps(asset_map, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    print(f'Nhinh visible height: {nhinh_h}px; mother {mother_h}px, boatman {boatman_h}px in-game')
    for key, size in summary:
        print(f'  {key:40s} {size[0]}x{size[1]}')
    print(f'Wrote {len(summary)} images and {MAP_PATH.relative_to(ROOT).as_posix()}')


if __name__ == '__main__':
    main()
