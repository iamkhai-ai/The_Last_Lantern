"""Redraw the legs of the left/right walk and run frames and bake them into the source sheets.

Run from the repository root, then regenerate the runtime frames:

    python assets/character/source_sheets/side-gait/build_side_gait_legs.py [dump_dir_for_authored_frames]
    ALLOW_CATALOG_OVERWRITE=1 python assets/character/prepare_frames.py

Everything is rebuilt from the pre-repair baseline commit named in provenance.json (frames, catalog and source
sheets), so re-running never stacks one correction on top of another. No generation API is called here.
"""
import hashlib
import json
import subprocess
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
CHAR = HERE.parents[1]
REPO = CHAR.parents[1]
BASELINE = json.loads((HERE / 'provenance.json').read_text(encoding='utf-8'))['baseline_commit']

OUTLINE = (6, 2, 1, 255)
# (mid, highlight, shade) sampled from the original boots, which use near-black outlines and dark red-brown leather.
NEAR_BOOT = ((72, 30, 16), (104, 48, 24), (46, 19, 10))
FAR_BOOT = ((60, 26, 14), (84, 39, 20), (40, 17, 9))
NEAR_PANTS = (70, 52, 44, 255)
FAR_PANTS = (44, 32, 28, 255)
# Boot facing right: heel on the left, toe on the right, full outsole row. Mirrored for left.
BOOT = ['.OOO...',
        '.OhbO..',
        '.OhbbO.',
        'ObbbbsO',
        'OOOOOOO']
BOOT_W, BOOT_H = 7, 5
GROUND_Y = 40


def git_show(rel):
    return subprocess.check_output(['git', 'show', f'{BASELINE}:assets/character/{rel}'], cwd=REPO)


CATALOG = json.loads(git_show('frames.json'))
ENTRIES = {e['file']: e for e in CATALOG['frames']}


def load_baseline(rel):
    return Image.open(BytesIO(git_show(rel))).convert('RGBA')


def side_gait_files():
    for direction in ('left', 'right'):
        for pose in ('walk', 'run'):
            for suffix in ('', '_lit', '_nolamp'):
                for phase in range(3):
                    yield f'nhinh_{direction}_{pose}{suffix}_{phase}.png'


def stamp_boot(layer, direction, foot, palette):
    mid, hi, shade = palette
    colors = {'O': OUTLINE, 'b': (*mid, 255), 'h': (*hi, 255), 's': (*shade, 255)}
    rows = BOOT if direction == 'right' else [row[::-1] for row in BOOT]
    ox, oy = foot[0] - 3, foot[1] - (BOOT_H - 1)
    for y, row in enumerate(rows):
        for x, mark in enumerate(row):
            if mark != '.' and 0 <= ox + x < 36 and 0 <= oy + y < 42:
                layer.putpixel((ox + x, oy + y), colors[mark])


def line_points(a, b):
    (x0, y0), (x1, y1) = a, b
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps)) for i in range(steps + 1)]


def stamp_limb(layer, path, color):
    """A 2-px wide limb with a clean 1-px outline, drawn on whole pixels only."""
    inner = Image.new('L', (36, 42), 0)
    for a, b in zip(path, path[1:]):
        for x, y in line_points(a, b):
            for dx in (0, 1):
                for dy in (0, 1):
                    if 0 <= x + dx < 36 and 0 <= y + dy < 42:
                        inner.putpixel((x + dx, y + dy), 255)
    halo = inner.filter(ImageFilter.MaxFilter(3))
    for y in range(42):
        for x in range(36):
            if halo.getpixel((x, y)) and not inner.getpixel((x, y)):
                layer.putpixel((x, y), OUTLINE)
    for y in range(42):
        for x in range(36):
            if inner.getpixel((x, y)):
                layer.putpixel((x, y), color)


def draw_leg(layer, direction, hip, hem, foot, is_near):
    sign = -1 if direction == 'left' else 1
    root = (hip - 1 + (sign if is_near else -sign), hem)
    # Leftmost interior column of the boot shaft, so the leg lands inside the boot's ankle.
    ankle = (foot[0] - 1 if direction == 'right' else foot[0], foot[1] - (BOOT_H - 1))
    knee_y = min(36, max(hem + 1, ankle[1] - 1))
    knee_x = (root[0] + ankle[0]) // 2 + (sign if foot[1] < GROUND_Y else 0)
    stamp_limb(layer, [root, (knee_x, knee_y), ankle], NEAR_PANTS if is_near else FAR_PANTS)
    stamp_boot(layer, direction, foot, NEAR_BOOT if is_near else FAR_BOOT)


def corrected_frame(name, baseline):
    entry = ENTRIES[name]
    direction, state, phase = entry['direction'], entry['state'], entry['frame']
    run = state.startswith('run')
    sign = -1 if direction == 'left' else 1
    cream = [(x, y) for y in range(28, 35) for x in range(11, 25)
             if (lambda c: c[3] >= 80 and c[0] > 145 and c[1] > 95 and c[2] > 40)(baseline.getpixel((x, y)))]
    hem = max(y for x, y in cream)
    lower_cream = [x for x, y in cream if y >= hem - 1]
    hip = round(sum(lower_cream) / len(lower_cream))
    front, back = (7, 6) if run else (4, 3)
    raised = 36 if run else 38
    if phase == 0:
        near, far = (hip + sign * front, GROUND_Y), (hip - sign * back, raised)
    elif phase == 2:
        near, far = (hip - sign * back, raised), (hip + sign * front, GROUND_Y)
    else:  # passing: support boot under the hip, swing boot lifted and clear of it so both read
        near, far = (hip, GROUND_Y), (hip + sign * 5, 37 if run else 38)

    legs = Image.new('RGBA', (36, 42))
    draw_leg(legs, direction, hip, hem, far, False)
    draw_leg(legs, direction, hip, hem, near, True)

    output = baseline.copy()
    output.paste((0, 0, 0, 0), (0, 32, 36, 42))
    output.alpha_composite(legs.crop((0, 32, 36, 42)), (0, 32))
    preserve = set()
    for y in range(32, 35):
        preserve.update((x, y) for x in range(36) if (x <= hip - 5 if sign == -1 else x >= hip + 5))
        xs = [x for x in range(36) if (lambda c: c[3] > 0 and c[0] > 120 and c[1] > 80 and c[2] > 40)(baseline.getpixel((x, y)))]
        if xs:
            preserve.update((x, y) for x in range(max(0, min(xs) - 1), min(36, max(xs) + 2)))
        for x in range(36):
            r, g, b, a = baseline.getpixel((x, y))
            if a and r > 70 and r > g * 2.6 and r > b * 2.2:
                preserve.add((x, y))
    lamp_box = None
    if not state.endswith('_nolamp'):
        seeds = [(x, y) for y in range(31, 41) for x in range(36)
                 if (x <= hip - 4 if sign == -1 else x >= hip + 4)
                 and (lambda c: c[3] >= 80 and c[0] >= 110 and c[1] >= 65 and c[1] > c[2] * 1.5)(baseline.getpixel((x, y)))]
        if seeds:
            lamp_box = (max(0, min(x for x, y in seeds) - 1), max(32, min(y for x, y in seeds) - 1),
                        min(36, max(x for x, y in seeds) + 2), min(42, max(y for x, y in seeds) + 2))
            preserve.update((x, y) for y in range(lamp_box[1], lamp_box[3]) for x in range(lamp_box[0], lamp_box[2]))
    for x, y in preserve:
        output.putpixel((x, y), baseline.getpixel((x, y)))
    return output, {'file': name, 'hip_x': hip, 'hem_y': hem, 'near_foot': list(near), 'far_foot': list(far),
                    'lamp_preserved_box': list(lamp_box) if lamp_box else None, 'preserved_lower_pixels': len(preserve)}


def bake(frames):
    """Write each corrected frame's rows below y=32 into the baseline source sheet it was cut from.

    Every output pixel becomes the source block that prepare_frames.py samples it from (same crop box and scale),
    so the figure's top and sole rows in the source sheet, which body-scale-anchors.json pins, do not move.
    """
    sheets = {}
    changes = []
    for name, frame in frames.items():
        entry = ENTRIES[name]
        rel = entry['source_sheet']
        sheet = sheets.setdefault(rel, load_baseline(rel))
        bounds, cell, scale = entry['crop_bounds_in_cell'], entry['source_cell'], entry['scale']
        sw, sh = bounds[2] - bounds[0], bounds[3] - bounds[1]
        w, h = round(sw * scale), round(sh * scale)
        ox, oy = (36 - w) // 2, 41 - h
        fx, fy = sw / w, sh / h

        def span(index, origin, factor, start, low, high):
            return (max(low, min(high, start + round((index - origin) * factor))),
                    max(low, min(high, start + round((index + 1 - origin) * factor))))

        for y in range(32, 42):
            y0, y1 = span(y, oy, fy, cell[1] + bounds[1], cell[1], cell[3])
            for x in range(36):
                x0, x1 = span(x, ox, fx, cell[0] + bounds[0], cell[0], cell[2])
                if x1 > x0 and y1 > y0:
                    sheet.paste(frame.getpixel((x, y)), (x0, y0, x1, y1))
        changes.append({'file': name, 'source_sheet': rel})
    for rel, sheet in sheets.items():
        sheet.save(CHAR / rel)
    return changes


def main():
    frames, records = {}, []
    for name in side_gait_files():
        frame, record = corrected_frame(name, load_baseline(name))
        buffer = BytesIO()
        frame.save(buffer, 'PNG')
        record['sha256'] = hashlib.sha256(buffer.getvalue()).hexdigest()
        frames[name] = frame
        records.append(record)
    changes = bake(frames)
    (HERE / 'coordinates.json').write_text(json.dumps({
        'boot_template': {'facing_right': BOOT, 'size': [BOOT_W, BOOT_H], 'left': 'mirrored',
                          'near_palette': NEAR_BOOT, 'far_palette': FAR_BOOT},
        'frames': records,
    }, indent=2), encoding='utf-8')
    if len(sys.argv) > 1:  # optional: dump the authored frames so the regenerated ones can be compared pixel for pixel
        dump = Path(sys.argv[1])
        dump.mkdir(parents=True, exist_ok=True)
        for name, frame in frames.items():
            frame.save(dump / name)
    print(f'Redrew {len(frames)} frames and baked them into {len({c["source_sheet"] for c in changes})} source sheets')


if __name__ == '__main__':
    main()
