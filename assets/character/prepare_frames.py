"""Slice the generated 4x4 pose sheets; no generation API is called here."""
import os
from pathlib import Path
import hashlib
import json
import re
import shutil
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
META = json.loads((ROOT / 'generation-prompts.json').read_text(encoding='utf-8'))
DIRECTIONS = [m['direction'] for m in META]
VARIANT_POSES = (('idle_lit', (0,)), ('walk_lit', (0, 1, 2)), ('run_lit', (0, 1, 2)),
                 ('idle_nolamp', (0,)), ('walk_nolamp', (0, 1, 2)), ('run_nolamp', (0, 1, 2)))
EXPECTED_VARIANT_FILES = {
    f'nhinh_{direction}_{state}_{frame}.png'
    for direction in DIRECTIONS
    for state, frames in VARIANT_POSES
    for frame in frames
}
COMBINED_CONTACT_SHEET_FILES = {'nhinh_state_variants_contact_sheet.png', 'nhinh_all_poses_contact_sheet.png'}
STAGING_TEMP = tempfile.TemporaryDirectory(prefix='.prepare-frames-', dir=ROOT)
STAGING = Path(STAGING_TEMP.name)
POSES = [('idle', 0)] + [(state, i) for state in ('walk', 'run', 'lantern_on', 'lantern_off', 'pulse') for i in range(3)]
raw = ROOT / 'source_sheets'
raw.mkdir(exist_ok=True)
entries = []
cells = []
owned = set()
_existing = None
existing_frames = []
variant_files_present = any((ROOT / name).is_file() for name in EXPECTED_VARIANT_FILES)
combined_contact_sheets_present = any((ROOT / name).is_file() for name in COMBINED_CONTACT_SHEET_FILES)
has_combined_catalog = variant_files_present or combined_contact_sheets_present
if (ROOT / 'frames.json').exists():
    _existing = json.loads((ROOT / 'frames.json').read_text(encoding='utf-8'))
    existing_frames = _existing.get('frames', [])
    contact_sheets = _existing.get('contact_sheets', {})
    contact_sheet_markers = set(contact_sheets) | set(contact_sheets.values()) if isinstance(contact_sheets, dict) else set()
    has_combined_catalog = (
        has_combined_catalog
        or _existing.get('frame_count', 0) > 128
        or len(existing_frames) > 128
        or _existing.get('state_variant_frame_count', 0) > 0
        or bool(contact_sheet_markers & {'state_variants_14_poses', 'all_30_poses', *COMBINED_CONTACT_SHEET_FILES})
    )
    owned = {f['file'] for f in existing_frames}
if has_combined_catalog and os.environ.get('ALLOW_CATALOG_OVERWRITE') != '1':
    raise RuntimeError(
        'Refusing to overwrite combined 240-frame catalog in frames.json. '
        'Set ALLOW_CATALOG_OVERWRITE=1 only when explicitly regenerating the 128 core frames.'
    )

def largest_component_bounds(mask):
    """Exclude disconnected glow fragments leaking in from the adjacent grid row."""
    width, height = mask.size
    data = bytearray(mask.tobytes())
    largest = []
    for start in range(len(data)):
        if not data[start]:
            continue
        data[start] = 0
        queue = [start]
        for pos in queue:
            x, y = pos % width, pos // width
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < width and 0 <= ny < height:
                    index = ny*width+nx
                    if data[index]:
                        data[index] = 0
                        queue.append(index)
        if len(queue) > len(largest):
            largest = queue
    if not largest:
        return None
    xs, ys = [p%width for p in largest], [p//width for p in largest]
    return min(xs),min(ys),max(xs)+1,max(ys)+1
for meta in META:
    match = re.search(r' as (C:\\[^\n]+\.png) by default', meta['output_hint'])
    if not match:
        raise RuntimeError('Cannot locate actual imagegen output: ' + meta['direction'])
    source = Path(match.group(1))
    target = raw / ('nhinh_' + meta['direction'] + '_generated.png')
    if target.exists() and target.read_bytes() != source.read_bytes():
        raise FileExistsError(target)
    if not target.exists():
        shutil.copy2(source, target)
    sheet = Image.open(target).convert('RGBA')
    w, h = sheet.size
    for index, (state, frame) in enumerate(POSES):
        col, row = index % 4, index // 4
        box = (round(col*w/4), round(row*h/4), round((col+1)*w/4), round((row+1)*h/4))
        cell = sheet.crop(box)
        # Ignore nearly invisible alpha fringe for the crop; retain the generated alpha inside it.
        mask = cell.getchannel('A').point(lambda a: 255 if a >= 80 else 0)
        bounds = mask.getbbox() if state == 'pulse' else largest_component_bounds(mask)
        if not bounds:
            raise RuntimeError(f'Empty pose {meta["direction"]}/{state}/{frame}')
        cells.append((meta['direction'], state, frame, cell, bounds, box))

# One scale for every frame; leave a one-pixel border for action effects.
scale = min(34 / max(c[4][2]-c[4][0] for c in cells), 39 / max(c[4][3]-c[4][1] for c in cells))
for direction, state, frame, cell, bounds, source_box in cells:
    crop = cell.crop(bounds)
    small = crop.resize((max(1, round(crop.width*scale)), max(1, round(crop.height*scale))), Image.Resampling.NEAREST)
    output = Image.new('RGBA', (36, 42))
    # All pose content rests on the same y=40 baseline, with a transparent bottom row.
    offset = ((36-small.width)//2, 41-small.height)
    output.alpha_composite(small, offset)
    name = f'nhinh_{direction}_{state}_{frame}.png'
    target = ROOT / name
    if target.exists() and name not in owned:
        raise FileExistsError(target)
    staged_target = STAGING / name
    output.save(staged_target)
    entries.append({'file': name, 'direction': direction, 'state': state, 'frame': frame, 'source_sheet': f'source_sheets/nhinh_{direction}_generated.png', 'source_cell': list(source_box), 'crop_bounds_in_cell': list(bounds), 'scale': scale, 'sha256': hashlib.sha256(staged_target.read_bytes()).hexdigest()})

core_entries = entries.copy()
variant_entries = []
if has_combined_catalog:
    regenerated_core_files = {entry['file'] for entry in core_entries}
    variant_entries = [entry for entry in existing_frames if entry['file'] not in regenerated_core_files]
    actual_variant_files = {entry['file'] for entry in variant_entries}
    if len(variant_entries) != 112 or actual_variant_files != EXPECTED_VARIANT_FILES:
        raise RuntimeError(
            f'Combined catalog must contain all 112 expected state variants; found {len(variant_entries)} entries.'
        )
    for entry in variant_entries:
        variant_path = ROOT / entry['file']
        if not variant_path.is_file() or hashlib.sha256(variant_path.read_bytes()).hexdigest() != entry.get('sha256'):
            raise RuntimeError(f'Combined catalog variant is missing or has a mismatched SHA-256: {entry["file"]}')
    entries.extend(variant_entries)

font = ImageFont.load_default()
cw, ch = 108, 160
contact = Image.new('RGB', (160+16*cw, 60+8*ch), '#132e2b')
draw = ImageDraw.Draw(contact)
draw.text((12, 10), 'NHINH | 8 directions x 16 poses | source: built-in image_gen | frames 36x42, shown at 3x', fill='#f0e2c8', font=font)
for i, (state, frame) in enumerate(POSES):
    draw.text((160+i*cw+3, 35), f'{state}\n{frame}', fill='#f0e2c8', font=font)
for y, direction in enumerate(DIRECTIONS):
    draw.text((12, 60+y*ch+50), direction, fill='#f0e2c8', font=font)
    for x, (state, frame) in enumerate(POSES):
        image = Image.open(STAGING / f'nhinh_{direction}_{state}_{frame}.png').convert('RGBA').resize((108,126), Image.Resampling.NEAREST)
        contact.paste(image, (160+x*cw, 60+y*ch+4), image)
        draw.rectangle((160+x*cw,60+y*ch,159+(x+1)*cw,59+(y+1)*ch),outline='#34524a')
contact.save(STAGING / 'nhinh_contact_sheet.png')
states = _existing.get('states', {'idle': 1, 'walk':3, 'run':3, 'lantern_on':3, 'lantern_off':3, 'pulse':3}) if variant_entries else {'idle': 1, 'walk':3, 'run':3, 'lantern_on':3, 'lantern_off':3, 'pulse':3}
manifest = dict(_existing or {})
manifest.update({'frame_size': [36,42], 'directions': DIRECTIONS, 'states': states, 'frame_count': len(entries), 'core_frame_count': len(core_entries), 'state_variant_frame_count': len(variant_entries), 'baseline_y':40, 'origin_recommended': [0.5,1], 'common_source_to_frame_scale': scale, 'frames': entries})
(STAGING / 'frames.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

errors = []
for entry in entries:
    image_path = STAGING / entry['file'] if entry in core_entries else ROOT / entry['file']
    image = Image.open(image_path)
    if image.size != (36,42) or image.mode != 'RGBA': errors.append(entry['file'] + ': size/mode')
    if hashlib.sha256(image_path.read_bytes()).hexdigest() != entry['sha256']: errors.append(entry['file'] + ': sha256')
    extrema = image.getchannel('A').getextrema()
    if extrema[0] != 0 or extrema[1] < 250: errors.append(entry['file'] + ': alpha extrema ' + str(extrema))
    if not image.getchannel('A').getbbox(): errors.append(entry['file'] + ': empty')
actual_frame_files = {p.name for p in ROOT.glob('nhinh_*_*.png') if 'contact_sheet' not in p.name}
actual_frame_files.update(entry['file'] for entry in core_entries)
if len(actual_frame_files) != len(entries): errors.append('Unexpected frame file count ' + str(len(actual_frame_files)))
expected_frame_count = 240 if has_combined_catalog else 128
if len(entries) != expected_frame_count: errors.append(f'Unexpected catalog entry count {len(entries)}; expected {expected_frame_count}')
report = {'result': 'FAIL' if errors else 'PASS', 'frame_count': len(entries), 'expected_frame_count': expected_frame_count, 'core_frame_count': len(core_entries), 'variant_frame_count': len(variant_entries), 'all_36x42_rgba': not errors, 'errors': errors, 'contact_sheets': sorted(p.name for p in ROOT.glob('*contact_sheet*.png')), 'visual_review': 'Pending contact-sheet inspection; technical checks do not establish animation quality.'}
(STAGING / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
if errors:
    (ROOT / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    raise SystemExit(1)

publish_targets = [
    (STAGING / entry['file'], ROOT / entry['file']) for entry in core_entries
] + [
    (STAGING / 'nhinh_contact_sheet.png', ROOT / 'nhinh_contact_sheet.png'),
    (STAGING / 'frames.json', ROOT / 'frames.json'),
    (STAGING / 'validation.json', ROOT / 'validation.json'),
]
backup_dir = STAGING / 'backup'
backup_dir.mkdir()
backups = {}
for index, (_, target) in enumerate(publish_targets):
    backup = backup_dir / str(index)
    if target.exists():
        shutil.copy2(target, backup)
        backups[target] = backup
    else:
        backups[target] = None

attempted_targets = []
try:
    for staged, target in publish_targets:
        attempted_targets.append(target)
        os.replace(staged, target)
except OSError:
    rollback_errors = []
    for target in reversed(attempted_targets):
        backup = backups[target]
        try:
            if backup is None:
                target.unlink(missing_ok=True)
            else:
                os.replace(backup, target)
        except OSError as error:
            rollback_errors.append(f'{target.name}: {error}')
    if rollback_errors:
        raise RuntimeError('Publishing failed and rollback was incomplete: ' + '; '.join(rollback_errors))
    raise
