"""Slice the generated 4x4 pose sheets; no generation API is called here."""
import os
from pathlib import Path
import hashlib
import json
import shutil
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
META = json.loads((ROOT / 'generation-prompts.json').read_text(encoding='utf-8'))
DIRECTIONS = [m['direction'] for m in META]
VARIANT_POSES = (('idle_lit', (0,)), ('walk_lit', (0, 1, 2)), ('run_lit', (0, 1, 2)),
                 ('idle_nolamp', (0,)), ('walk_nolamp', (0, 1, 2)), ('run_nolamp', (0, 1, 2)))
STATE_VARIANT_POSES = [(state, frame) for state, frames in VARIANT_POSES for frame in frames]
MOVEMENT_POSES = [('idle', (0,)), ('walk', (0, 1, 2)), ('run', (0, 1, 2))]
ANCHORS = json.loads((ROOT / 'body-scale-anchors.json').read_text(encoding='utf-8'))['anchors']
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
MOVEMENT_POSES = [('idle', (0,)), ('walk', (0, 1, 2)), ('run', (0, 1, 2))]
ANCHORS = json.loads((ROOT / 'body-scale-anchors.json').read_text(encoding='utf-8'))['anchors']
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
        'Set ALLOW_CATALOG_OVERWRITE=1 only when deliberately regenerating all 240 frames from committed source sheets.'
    )

def record_preflight_failure(message, variant_count=None):
    report = {
        'result': 'FAIL',
        'stage': 'preflight',
        'frame_count': len(existing_frames),
        'expected_frame_count': 240 if has_combined_catalog else 128,
        'core_frame_count': (_existing or {}).get('core_frame_count', 0),
        'variant_frame_count': variant_count if variant_count is not None else (_existing or {}).get('state_variant_frame_count', 0),
        'errors': [message],
        'contact_sheets': list((_existing or {}).get('contact_sheets', {}).values()),
        'visual_review': 'NOT_RUN: regeneration preflight failed.',
    }
    failure_path = STAGING / 'validation.failed.json'
    failure_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    os.replace(failure_path, ROOT / 'validation.failed.json')
    print(json.dumps(report, indent=2))
    raise RuntimeError(message)

def largest_component_bounds(mask, include_mask=False):
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
    bounds = min(xs),min(ys),max(xs)+1,max(ys)+1
    if include_mask:
        component = bytearray(width * height)
        for pos in largest:
            component[pos] = 255
        return bounds, Image.frombytes('L', (width, height), bytes(component))
    return bounds


def source_cells(path, poses, rows):
    sheet = Image.open(path).convert('RGBA')
    for index, (state, frame) in enumerate(poses):
        col, row = index % 4, index // 4
        box = (round(col * sheet.width / 4), round(row * sheet.height / rows),
               round((col + 1) * sheet.width / 4), round((row + 1) * sheet.height / rows))
        cell = sheet.crop(box)
        mask = cell.getchannel('A').point(lambda alpha: 255 if alpha >= 80 else 0)
        bounds = largest_component_bounds(mask) if rows == 4 and state != 'pulse' else mask.getbbox()
        if bounds is None:
            raise ValueError(f'Empty source cell: {path}/{state}/{frame}')
        yield state, frame, cell, bounds, box


def save_variant_frame(direction, state, frame, path, cell, bounds, box, scale,
                       anchor, body_mask, reference, provenance):
    crop = cell.crop(bounds)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    if size[0] > 34 or size[1] > 40:
        raise ValueError(f'Variant exceeds safe canvas area: {direction}/{state}/{frame}: {size}')
    small = crop.resize(size, Image.Resampling.NEAREST)
    output = Image.new('RGBA', (36, 42))
    offset = ((36 - small.width) // 2, 41 - small.height)
    output.alpha_composite(small, offset)
    mapped_body = Image.new('L', output.size)
    mapped_body.paste(body_mask.crop(bounds).resize(size, Image.Resampling.NEAREST), offset)
    name = f'nhinh_{direction}_{state}_{frame}.png'
    target = STAGING / name
    output.save(target)
    return {
        'file': name, 'direction': direction, 'state': state, 'frame': frame,
        'source_sheet': path.relative_to(ROOT).as_posix(), 'provenance': provenance,
        'source_cell': list(box), 'crop_bounds_in_cell': list(bounds), 'scale': scale,
        'output_bbox': list(output.getchannel('A').getbbox()),
        'body_scale_reference': anchor['reference_frame'],
        'source_body_y': [anchor['body_top_y'], anchor['body_bottom_y_exclusive']],
        'target_body_height': reference['output_bbox'][3] - reference['output_bbox'][1],
        'output_body_bbox': list(mapped_body.getbbox()),
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    }
for meta in META:
    target = ROOT / 'source_sheets' / ('nhinh_' + meta['direction'] + '_generated.png')
    if not target.is_file():
        record_preflight_failure('Missing committed core source sheet: ' + target.name)
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
    entries.append({'file': name, 'direction': direction, 'state': state, 'frame': frame,
                    'source_sheet': f'source_sheets/nhinh_{direction}_generated.png', 'source_cell': list(source_box),
                    'crop_bounds_in_cell': list(bounds), 'scale': scale,
                    'output_bbox': list(output.getchannel('A').getbbox()),
                    'sha256': hashlib.sha256(staged_target.read_bytes()).hexdigest()})

core_entries = entries.copy()
variant_entries = []
if has_combined_catalog:
    regenerated_core_files = {entry['file'] for entry in core_entries}
    existing_variant_entries = [entry for entry in existing_frames if entry['file'] not in regenerated_core_files]
    actual_variant_files = {entry['file'] for entry in existing_variant_entries}
    if len(existing_variant_entries) != 112 or actual_variant_files != EXPECTED_VARIANT_FILES:
        record_preflight_failure(f'Combined catalog must contain all 112 expected state variants; found {len(existing_variant_entries)} entries.', len(existing_variant_entries))
    for entry in existing_variant_entries:
        variant_path = ROOT / entry['file']
        if not variant_path.is_file() or hashlib.sha256(variant_path.read_bytes()).hexdigest() != entry.get('sha256'):
            record_preflight_failure(f'Combined catalog variant is missing or has a mismatched SHA-256: {entry["file"]}', len(existing_variant_entries))
    core_by_file = {entry['file']: entry for entry in core_entries}
    expected_anchors = set()
    source_debris = []
    for direction in DIRECTIONS:
        for variant in ('lit', 'nolamp'):
            paths = list((ROOT / 'source_sheets/state_variants').rglob(f'nhinh_{direction}_{variant}_sheet.png'))
            if len(paths) != 1:
                record_preflight_failure(f'Expected one {direction}/{variant} source sheet; found {len(paths)}.', len(existing_variant_entries))
            path = paths[0]
            provenance = list(path.parent.glob(f'{direction}_{variant}.provenance.json'))
            provenance_path = (provenance[0] if provenance else
                               ROOT / 'source_sheets/state_variants/worker_down/state-variant-generation-prompts.json')
            poses = [(state, frame) for state, frames in MOVEMENT_POSES for frame in frames]
            for state, frame, cell, alpha_bounds, box in source_cells(path, poses, 2):
                name = f'nhinh_{direction}_{state}_{variant}_{frame}.png'
                if name not in EXPECTED_VARIANT_FILES:
                    raise ValueError(f'Unexpected generated variant name: {name}')
                expected_anchors.add(name)
                mask = cell.getchannel('A').point(lambda alpha: 255 if alpha >= 80 else 0)
                body_bounds, body_mask = largest_component_bounds(mask, include_mask=True)
                if alpha_bounds != body_bounds:
                    source_debris.append({'file': name, 'full_alpha_bounds_in_cell': list(alpha_bounds),
                                          'body_component_bounds_in_cell': list(body_bounds)})
                anchor = ANCHORS.get(name)
                if not anchor:
                    raise ValueError(f'Missing body-scale anchor: {name}')
                if [anchor['body_top_y'], anchor['body_bottom_y_exclusive']] != [body_bounds[1], body_bounds[3]]:
                    raise ValueError(f'Body-scale anchor differs from connected component: {name}')
                reference = core_by_file.get(anchor['reference_frame'])
                if not reference or (reference['direction'], reference['state'], reference['frame']) != (direction, state, frame):
                    raise ValueError(f'Body-scale anchor references the wrong core pose: {name}')
                body_height = reference['output_bbox'][3] - reference['output_bbox'][1]
                variant_scale = body_height / (body_bounds[3] - body_bounds[1])
                variant_entries.append(save_variant_frame(
                    direction, f'{state}_{variant}', frame, path, cell, body_bounds, box,
                    variant_scale, anchor, body_mask, reference,
                    provenance_path.relative_to(ROOT).as_posix()))
    if expected_anchors != set(ANCHORS) or expected_anchors != EXPECTED_VARIANT_FILES:
        raise ValueError('Body-scale anchor catalog does not match all 112 expected variants')
    entries.extend(variant_entries)

font = ImageFont.load_default()
cw, ch = 108, 160
core_files = {entry['file'] for entry in core_entries}
staged_frame_files = core_files | {entry['file'] for entry in variant_entries}
contact_sheet_map = {'core_16_poses': 'nhinh_contact_sheet.png'}
contact_sheet_poses = [(POSES, 'nhinh_contact_sheet.png', '16 core poses')]
if variant_entries:
    contact_sheet_map.update({'state_variants_14_poses': 'nhinh_state_variants_contact_sheet.png', 'all_30_poses': 'nhinh_all_poses_contact_sheet.png'})
    contact_sheet_poses.extend([
        (STATE_VARIANT_POSES, 'nhinh_state_variants_contact_sheet.png', '14 state variants'),
        (POSES + STATE_VARIANT_POSES, 'nhinh_all_poses_contact_sheet.png', '30 total poses'),
    ])

for poses, filename, description in contact_sheet_poses:
    contact = Image.new('RGB', (160+len(poses)*cw, 60+8*ch), '#132e2b')
    draw = ImageDraw.Draw(contact)
    draw.text((12, 10), f'NHINH | 8 directions x {description} | frames 36x42, shown at 3x', fill='#f0e2c8', font=font)
    for i, (state, frame) in enumerate(poses):
        draw.text((160+i*cw+3, 35), f'{state}\n{frame}', fill='#f0e2c8', font=font)
    for y, direction in enumerate(DIRECTIONS):
        draw.text((12, 60+y*ch+50), direction, fill='#f0e2c8', font=font)
        for x, (state, frame) in enumerate(poses):
            name = f'nhinh_{direction}_{state}_{frame}.png'
            source = STAGING if name in staged_frame_files else ROOT
            image = Image.open(source / name).convert('RGBA').resize((108,126), Image.Resampling.NEAREST)
            contact.paste(image, (160+x*cw, 60+y*ch+4), image)
            draw.rectangle((160+x*cw,60+y*ch,159+(x+1)*cw,59+(y+1)*ch),outline='#34524a')
    contact.save(STAGING / filename)
states = _existing.get('states', {'idle': 1, 'walk':3, 'run':3, 'lantern_on':3, 'lantern_off':3, 'pulse':3}) if variant_entries else {'idle': 1, 'walk':3, 'run':3, 'lantern_on':3, 'lantern_off':3, 'pulse':3}
manifest = dict(_existing or {})
manifest.update({'frame_size': [36,42], 'directions': DIRECTIONS, 'states': states, 'frame_count': len(entries), 'core_frame_count': len(core_entries), 'state_variant_frame_count': len(variant_entries), 'baseline_y':40, 'origin_recommended': [0.5,1], 'common_source_to_frame_scale': scale, 'contact_sheets': contact_sheet_map, 'frames': entries})
(STAGING / 'frames.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

errors = []
size_mode_ok = True
baseline_ok = True
walk_run_groups = {}
hash_to_files = {}
for entry in entries:
    image_path = STAGING / entry['file'] if entry['file'] in staged_frame_files else ROOT / entry['file']
    image = Image.open(image_path)
    if image.size != (36,42) or image.mode != 'RGBA':
        size_mode_ok = False
        errors.append(entry['file'] + ': size/mode')
    actual_hash = hashlib.sha256(image_path.read_bytes()).hexdigest()
    if actual_hash != entry['sha256']: errors.append(entry['file'] + ': sha256')
    hash_to_files.setdefault(actual_hash, []).append(entry['file'])
    extrema = image.getchannel('A').getextrema()
    if extrema[0] != 0 or extrema[1] < 250: errors.append(entry['file'] + ': alpha extrema ' + str(extrema))
    alpha_bounds = image.getchannel('A').getbbox()
    if not alpha_bounds: errors.append(entry['file'] + ': empty')
    if entry['state'] != 'pulse' and alpha_bounds and alpha_bounds[3] != 41:
        baseline_ok = False
        errors.append(entry['file'] + f': baseline_y {alpha_bounds[3] - 1}')
    if entry in variant_entries:
        body_bbox = entry['output_body_bbox']
        measured_body = largest_component_bounds(image.getchannel('A').point(lambda alpha: 255 if alpha >= 80 else 0))
        target_height = entry['target_body_height']
        if body_bbox[3] - body_bbox[1] != target_height or body_bbox[3] != 41:
            errors.append(entry['file'] + ': mapped body height/baseline differs from core pose')
        if measured_body[3] - measured_body[1] != target_height or measured_body[3] != 41:
            errors.append(entry['file'] + ': measured connected body height/baseline differs from core pose')
    if entry['state'] in {'walk', 'run', 'walk_lit', 'run_lit', 'walk_nolamp', 'run_nolamp'}:
        walk_run_groups.setdefault((entry['direction'], entry['state']), []).append((entry['frame'], actual_hash))
duplicate_frame_hashes = sorted(value for value, files in hash_to_files.items() if len(files) > 1)
if duplicate_frame_hashes:
    errors.append('Duplicate frame hashes: ' + ', '.join(duplicate_frame_hashes))
walk_run_triplets_unique = True
walk_run_states = ['walk', 'run']
if variant_entries:
    walk_run_states.extend(('walk_lit', 'run_lit', 'walk_nolamp', 'run_nolamp'))
for direction in DIRECTIONS:
    for state in walk_run_states:
        frames = walk_run_groups.get((direction, state), [])
        if sorted(frame for frame, _ in frames) != [0, 1, 2] or len({digest for _, digest in frames}) != 3:
            walk_run_triplets_unique = False
            errors.append(f'Non-unique or incomplete {direction}/{state} triplet')
actual_frame_files = {p.name for p in ROOT.glob('nhinh_*_*.png') if 'contact_sheet' not in p.name}
actual_frame_files.update(entry['file'] for entry in core_entries)
if len(actual_frame_files) != len(entries): errors.append('Unexpected frame file count ' + str(len(actual_frame_files)))
expected_frame_count = 240 if has_combined_catalog else 128
if len(entries) != expected_frame_count: errors.append(f'Unexpected catalog entry count {len(entries)}; expected {expected_frame_count}')
contact_sheet_names = [name for name in contact_sheet_map.values()]
report = {'result': 'FAIL' if errors else 'PASS', 'frame_count': len(entries), 'expected_frame_count': expected_frame_count, 'core_frame_count': len(core_entries), 'variant_frame_count': len(variant_entries), 'all_36x42_rgba': size_mode_ok, 'all_non_pulse_baseline_y40': baseline_ok, 'all_walk_run_triplets_unique': walk_run_triplets_unique, 'all_variant_body_heights_match_core_pose': not any('body height/baseline' in error for error in errors), 'variant_source_cells_checked_for_detached_debris': len(expected_anchors) if has_combined_catalog else 0, 'source_cells_with_excluded_detached_debris': source_debris if has_combined_catalog else [], 'duplicate_frame_hashes': duplicate_frame_hashes, 'errors': errors, 'contact_sheets': contact_sheet_names, 'visual_review': 'NOT_RUN by generator: inspect contact sheets; technical checks do not establish animation quality.'}
(STAGING / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
if errors:
    os.replace(STAGING / 'validation.json', ROOT / 'validation.failed.json')
    raise SystemExit(1)

publish_targets = [
    (STAGING / entry['file'], ROOT / entry['file']) for entry in core_entries
] + [
    (STAGING / entry['file'], ROOT / entry['file']) for entry in variant_entries
] + [
    (STAGING / name, ROOT / name) for name in contact_sheet_names
] + [
    (STAGING / 'frames.json', ROOT / 'frames.json'),
    (STAGING / 'validation.json', ROOT / 'validation.json'),
    (None, ROOT / 'validation.failed.json'),
]
backup_dir = Path(tempfile.mkdtemp(prefix='.prepare-frames-backup-', dir=ROOT))
backups = {}
try:
    for index, (_, target) in enumerate(publish_targets):
        backup = backup_dir / str(index)
        if target.exists():
            shutil.copy2(target, backup)
            backups[target] = backup
        else:
            backups[target] = None
except BaseException:
    shutil.rmtree(backup_dir, ignore_errors=True)
    raise

attempted_targets = []
try:
    for staged, target in publish_targets:
        attempted_targets.append(target)
        if staged is None:
            target.unlink(missing_ok=True)
        else:
            os.replace(staged, target)
except BaseException as publish_error:
    rollback_errors = []
    for target in reversed(attempted_targets):
        backup = backups[target]
        try:
            if backup is None:
                target.unlink(missing_ok=True)
            else:
                os.replace(backup, target)
        except BaseException as error:
            rollback_errors.append(f'{target.name}: {error}')
    if rollback_errors:
        raise RuntimeError(
            f'Publishing failed and rollback was incomplete; backups preserved at {backup_dir}: '
            + '; '.join(rollback_errors)
        ) from publish_error
    shutil.rmtree(backup_dir, ignore_errors=True)
    raise
else:
    shutil.rmtree(backup_dir, ignore_errors=True)
