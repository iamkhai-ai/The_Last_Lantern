"""Prepare V4 level 00 (workshop) runtime art at 2x the in-game pixel size.

Run from the repo root:  python scripts/prepare-v4-workshop.py

Reads only:
  assets/prologue/story-v4-art-v1/   (never written)
  assets/character/nhinh_up_idle_0.png  (measures Nhinh's visible height)
Writes:
  assets/levels/00-workshop/sprites/        sprites + workshop-bg.png
  assets/levels/00-workshop/illustrations/  01..05 at 1280x720
  assets/levels/00-workshop/asset-map.json

Sprites are cut from sheets by connected components (alpha > 24), each assigned to
the grid cell that contains its centre. A plain grid crop would clip the bench, tray,
map and ring, whose pixels cross cell boundaries on the repair-props sheet.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'assets' / 'prologue' / 'story-v4-art-v1'
ART_WS = ART / 'workshop'
ART_ILL = ART / 'illustrations'
NHINH = ROOT / 'assets' / 'character' / 'nhinh_up_idle_0.png'
OUT = ROOT / 'assets' / 'levels' / '00-workshop'
OUT_SPR = OUT / 'sprites'
OUT_ILL = OUT / 'illustrations'
MAP_PATH = OUT / 'asset-map.json'

ALPHA_MIN = 24      # alpha must be greater than this to count as visible
SPECK_MIN = 20      # components smaller than this many pixels are ignored
GAME_SCALE = 2      # runtime art is 2x the in-game pixel size (game draws at 0.5)
BG_SIZE = (1280, 720)

REL = lambda p: p.relative_to(ROOT).as_posix()


def visible_bbox(img):
    return img.split()[3].point(lambda a: 255 if a > ALPHA_MIN else 0).getbbox()


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
        raise SystemExit(f'{REL(path)}: expected one sprite per cell, got {sorted((k, len(v)) for k, v in by_cell.items())}')
    cells = {}
    for idx, (bbox,) in by_cell.items():
        cells[idx] = (sheet.crop(bbox), bbox)
    # Sprites must not overlap each other on the sheet, or one would bleed into another.
    boxes = [b for _, b in cells.values()]
    for i, a in enumerate(boxes):
        for b in boxes[i + 1:]:
            if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                raise SystemExit(f'{REL(path)}: sprite bboxes overlap {a} {b}')
    return cells, (w, h)


def grid_clip_report(path, cols, rows, cells):
    """Names sprites whose naive grid cell would have clipped them (informational)."""
    with Image.open(path) as src:
        sheet = src.convert('RGBA')
    w, h = sheet.size
    clipped = []
    for idx in range(cols * rows):
        c, r = idx % cols, idx // cols
        cell_box = (c * w // cols, r * h // rows, (c + 1) * w // cols, (r + 1) * h // rows)
        bb = visible_bbox(sheet.crop(cell_box))
        if bb is None:
            continue
        if bb[0] == 0 or bb[1] == 0 or bb[2] == cell_box[2] - cell_box[0] or bb[3] == cell_box[3] - cell_box[1]:
            clipped.append(idx)
    return clipped


def fit(img, width=None, height=None):
    """Scale a trimmed sprite to a target width or height (LANCZOS, aspect kept)."""
    if height is not None:
        w = round(img.width * height / img.height)
        h = height
    else:
        w = width
        h = round(img.height * width / img.width)
    return img.resize((w, h), Image.LANCZOS)


def main():
    OUT_SPR.mkdir(parents=True, exist_ok=True)
    OUT_ILL.mkdir(parents=True, exist_ok=True)

    with Image.open(NHINH) as nh:
        nhinh_bbox = visible_bbox(nh.convert('RGBA'))
    nhinh_h = nhinh_bbox[3] - nhinh_bbox[1]
    mother_h = nhinh_h + 2     # in-game visible height, plan value 30
    boatman_h = nhinh_h + 1    # in-game visible height, plan value 29

    assets = {}
    summary = []

    def record_sprite(name, img, src_rel, cell, anchor='bottom-center'):
        out_path = OUT_SPR / name
        img.save(out_path)
        assets[f'sprites/{name}'] = {
            'kind': 'sprite',
            'source': src_rel,
            'source_cell': cell,
            'output_size': list(img.size),
            'in_game_size': [img.width / GAME_SCALE, img.height / GAME_SCALE],
            'anchor': anchor,
        }
        summary.append((f'sprites/{name}', img.size))

    # Background.
    with Image.open(ART_WS / '01-background.png') as bg:
        bg_out = bg.convert('RGBA').resize(BG_SIZE, Image.LANCZOS)
    bg_out.save(OUT_SPR / 'workshop-bg.png')
    assets['sprites/workshop-bg.png'] = {
        'kind': 'background',
        'source': REL(ART_WS / '01-background.png'),
        'source_cell': None,
        'output_size': list(BG_SIZE),
        'in_game_size': [BG_SIZE[0] / GAME_SCALE, BG_SIZE[1] / GAME_SCALE],
        'anchor': 'top-left',
    }
    summary.append(('sprites/workshop-bg.png', BG_SIZE))

    # Repair props, 3x3 row-major.
    props_src = ART_WS / '04-repair-props.png'
    props, _ = cut_sheet(props_src, 3, 3)
    naive_clipped = grid_clip_report(props_src, 3, 3, props)
    prop_specs = [
        (0, 'bench.png', 'width', 58),
        (1, 'parts-tray.png', 'width', 34),
        (2, 'panel-off.png', 'width', 22),
        (3, 'panel-fault.png', 'width', 22),
        (4, 'customer-lamp-open.png', 'height', 14),
        (5, 'customer-lamp-closed.png', 'height', 14),
        (6, 'customer-lamp-lit.png', 'height', 14),
        (7, 'retaining-ring.png', 'width', 10),
        (8, 'map.png', 'width', 20),
    ]
    for cell, name, axis, in_game in prop_specs:
        sprite, _ = props[cell]
        target = in_game * GAME_SCALE
        out = fit(sprite, **{axis: target})
        record_sprite(name, out, REL(props_src), cell)

    # Characters, 2x2 row-major.
    chars = [
        ('02-mother-poses.png', ['mother-front.png', 'mother-back.png', 'mother-map.png', 'mother-work.png'], mother_h),
        ('03-boatman-poses.png', ['boatman-front.png', 'boatman-back.png', 'boatman-lamp.png', 'boatman-walk.png'], boatman_h),
    ]
    for sheet_name, names, in_game_h in chars:
        src = ART_WS / sheet_name
        cells, _ = cut_sheet(src, 2, 2)
        for cell, name in enumerate(names):
            sprite, _ = cells[cell]
            out = fit(sprite, height=in_game_h * GAME_SCALE)
            record_sprite(name, out, REL(src), cell)

    # Illustrations, 1280x720 RGB.
    illus = [
        '01-ben-suong.png',
        '02-leaving-ben-suong.png',
        '03-maintenance-station.png',
        '04-waiting-for-morning.png',
        '05-morning-without-dawn.png',
    ]
    for name in illus:
        src = ART_ILL / name
        with Image.open(src) as im:
            out = im.convert('RGB').resize(BG_SIZE, Image.LANCZOS)
        out.save(OUT_ILL / name)
        assets[f'illustrations/{name}'] = {
            'kind': 'illustration',
            'source': REL(src),
            'source_cell': None,
            'output_size': list(BG_SIZE),
            'in_game_size': [BG_SIZE[0] / GAME_SCALE, BG_SIZE[1] / GAME_SCALE],
            'anchor': 'top-left',
        }
        summary.append((f'illustrations/{name}', BG_SIZE))

    asset_map = {
        'scale': GAME_SCALE,
        'nhinh_visible_height': nhinh_h,
        'assets': dict(sorted(assets.items())),
    }
    MAP_PATH.write_text(json.dumps(asset_map, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    print(f'Nhinh visible height: {nhinh_h}px; mother {mother_h}px, boatman {boatman_h}px in-game')
    for rel, size in summary:
        print(f'  {rel:40s} {size[0]}x{size[1]}')
    print(f'Grid-cut props sheet would have clipped cells: {naive_clipped} (extracted whole instead)')
    print(f'Wrote {len(summary)} images and {REL(MAP_PATH)}')


if __name__ == '__main__':
    main()
