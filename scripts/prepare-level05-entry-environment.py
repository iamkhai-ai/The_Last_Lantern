"""Deterministic native-size export for the Level 05 entry preview.

The raw generated master is retained byte-for-byte. It is first reduced to the shipped 640x360
native grid with nearest-neighbour sampling, then registered to the authoritative entry geometry
with a piecewise-linear axis warp (also nearest-neighbour, no interpolation, no new dependency).
Registration never changes gameplay geometry: it only moves the painted boundaries onto the
existing `PATH_ROOMS.entry` walls, doorway slots and central divider.

Axis landmarks are measured on the 640x360 nearest resize of one exact source master. They are
pinned to that master's SHA-256: a different hash is rejected instead of being warped with
landmarks that do not describe it. Re-measure and register a new profile when the source changes.

No generated object art is touched. Omit --source to rebuild only the geometry guide plate.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
from bisect import bisect_right
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / 'assets/levels/05-a-path-for-two/environment-v3'
OUT = ROOT / 'assets/levels/05-a-path-for-two/sprites/entry-environment-base.png'
REPORT = ENV / 'normalization-report.json'
GEOMETRY = ENV / 'entry-geometry.json'
SIZE = (640, 360)

EXPECTED_SOURCE_SHA256 = 'eb2828a2ce148748f28e9eabcdfe38ba77c672b5aba5a44ba702f1504da216af'

# Landmarks measured on the current 640x360 nearest resize. Source values describe where the
# painted boundary actually is; target values are the shipped geometry it must land on.
SOURCE_PROFILES = {
    EXPECTED_SOURCE_SHA256: {
        'x': {
            'source': [0, 24, 130, 194, 307, 328, 444, 510, 616, 640],
            'target': [0, 24, 124, 188, 300, 320, 448, 512, 616, 640],
        },
        'y': {
            'source': [0, 66, 150, 178, 310, 360],
            'target': [0, 80, 180, 210, 310, 360],
        },
    },
}


def display_path(path: Path) -> str:
    """Stable POSIX path for the report, relative to the repository when possible."""
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def build_geometry_plate(layout: dict) -> Path:
    """Paint the authored collision grid. Bright areas are guides, never runtime content."""
    plate = Image.new('RGB', SIZE, '#788d94')
    draw = ImageDraw.Draw(plate)
    for wall in layout['walls']:
        x, y, w, h = (wall[k] for k in ('x', 'y', 'width', 'height'))
        draw.rectangle((x, y, x+w-1, y+h-1), fill='#263c49')
    # Existing gate art supplies these openings; the plate only reserves their footprint.
    for x in (124, 448):
        draw.rectangle((x, 122, x+63, 209), fill='#c78db5')
        draw.rectangle((x+10, 122, x+53, 209), fill='#a3c5b3')
    path = ENV / 'entry-geometry-guide.png'
    plate.save(path)
    return path


def axis_cell_map(source_landmarks: list[int], target_landmarks: list[int], size: int) -> list[int]:
    """Map each target pixel cell to one source cell along one axis.

    Landmarks describe cell edges. Sampling the centre of each target cell and flooring keeps
    every landmark cell on its source landmark while making the cell just before a boundary use
    the adjacent source cell. Segment boundaries therefore introduce no skipped or duplicated
    line: cells stay edge-adjacent across every piecewise join.
    """
    if len(source_landmarks) != len(target_landmarks) or len(source_landmarks) < 2:
        raise ValueError('axis landmarks need the same length (at least two pairs)')
    if source_landmarks[0] != 0 or target_landmarks[0] != 0:
        raise ValueError('axis landmarks must start at 0')
    if source_landmarks[-1] != size or target_landmarks[-1] != size:
        raise ValueError(f'axis landmarks must end at {size}')
    for values in (source_landmarks, target_landmarks):
        if any(b <= a for a, b in zip(values, values[1:])):
            raise ValueError('axis landmarks must be strictly increasing')

    cells: list[int] = []
    for cell in range(size):
        centre = cell + 0.5
        segment = min(bisect_right(target_landmarks, centre) - 1, len(target_landmarks) - 2)
        segment = max(segment, 0)
        s0, s1 = source_landmarks[segment], source_landmarks[segment + 1]
        t0, t1 = target_landmarks[segment], target_landmarks[segment + 1]
        mapped = s0 + (centre - t0) * (s1 - s0) / (t1 - t0)
        cells.append(min(size - 1, max(0, math.floor(mapped))))

    if any(b < a for a, b in zip(cells, cells[1:])):
        raise ValueError('registered axis is not monotonic')
    for index, target in enumerate(target_landmarks[:-1]):
        if cells[target] != source_landmarks[index]:
            raise ValueError(f'landmark {target} does not sample source {source_landmarks[index]}')
        if index and cells[target] - cells[target - 1] != 1:
            raise ValueError(f'landmark boundary {target} is not edge-adjacent to its neighbour')
    return cells


def registration_maps(profile: dict) -> dict[str, list[int]]:
    return {
        axis: axis_cell_map(profile[axis]['source'], profile[axis]['target'], SIZE[index])
        for index, axis in enumerate(('x', 'y'))
    }


def warp_nearest(image: Image.Image, maps: dict[str, list[int]]) -> Image.Image:
    """Apply the per-axis cell map with pure nearest-neighbour copies."""
    if image.size != SIZE:
        raise ValueError(f'warp expects {SIZE}, got {image.size}')
    source = image.load()
    registered = Image.new('RGB', SIZE)
    target = registered.load()
    x_map, y_map = maps['x'], maps['y']
    for y, source_y in enumerate(y_map):
        for x, source_x in enumerate(x_map):
            target[x, y] = source[source_x, source_y]
    return registered


def normalize(source_path: Path, output_path: Path = OUT, report_path: Path = REPORT) -> dict:
    """Read, validate, register and palette-limit the master. Returns the written report."""
    raw = source_path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    profile = SOURCE_PROFILES.get(digest)
    if profile is None:
        raise SystemExit(
            f'Rejected source {source_path}: sha256 {digest} has no registered landmark profile.\n'
            f'These piecewise landmarks describe only {EXPECTED_SOURCE_SHA256}; warping a different '
            'master with them would move real boundaries away from the shipped geometry. '
            'Re-measure the source-native landmarks and add a profile in SOURCE_PROFILES first.'
        )

    with Image.open(io.BytesIO(raw)) as image:
        if abs(image.width / image.height - 16/9) > 0.06:
            raise SystemExit(f'Reject master aspect {image.size}; regenerate a 16:9 frame rather than crop geometry.')
        icc = image.info.get('icc_profile')
        rgb = image.convert('RGB')

    native = rgb.resize(SIZE, Image.Resampling.NEAREST)
    registered = warp_nearest(native, registration_maps(profile))
    # Generated artwork is a draft. Enforce a bounded palette without dithering. The indexed
    # result is kept as an opaque palette PNG: same pixels, much smaller than a 24-bit encode.
    normalized = registered.quantize(
        colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    metadata = {'icc_profile': icc} if icc else {}
    normalized.save(output_path, optimize=True, **metadata)
    saved = Image.open(output_path)
    actual_mode = saved.mode
    saved.close()

    report = {
        'source': display_path(source_path),
        'output': display_path(output_path),
        'size': list(SIZE),
        'mode': actual_mode,
        'palette_limit': 128,
        'dither': False,
        'resample': 'nearest',
        'registration': {
            'method': 'piecewise-linear axis registration with nearest-neighbour sampling at pixel centres',
            'source_coordinate_space': '640x360 nearest-neighbour resize of the raw master',
            'axis_landmarks': {
                axis: {
                    'source': list(profile[axis]['source']),
                    'target': list(profile[axis]['target']),
                }
                for axis in ('x', 'y')
            },
            'aligned_geometry': {
                'door_slots_x': [[124, 188], [448, 512]],
                'central_divider_x': [300, 320],
                'wall_bands_y': [[0, 80], [180, 210], [310, 360]],
            },
            'boundary_policy': (
                'Each target landmark cell samples its source landmark; the adjacent target cell '
                'samples the adjacent source cell, so piecewise joins add no skipped or duplicated line.'
            ),
        },
        'landmarks_note': (
            f'Source and destination landmarks were measured on the 640x360 nearest resize of '
            f'source_sha256 {digest}. They are specific to that exact master: a different source '
            'hash is rejected instead of warped with these values.'
        ),
        'source_sha256': digest,
        'expected_source_sha256': EXPECTED_SOURCE_SHA256,
        'output_sha256': hashlib.sha256(output_path.read_bytes()).hexdigest(),
        'bytes': output_path.stat().st_size,
        'geometry_source_sha256': hashlib.sha256((ROOT/'src/data/pathForTwoLayout.ts').read_bytes()).hexdigest(),
        'entry_geometry_sha256': hashlib.sha256(GEOMETRY.read_bytes()).hexdigest(),
        'metadata_note': 'Raw generated master retained unchanged; ICC copied if supplied; any other credentials remain in raw source.',
    }
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, help='Retained raw generated master to normalize; omit to build geometry plate only.')
    args = parser.parse_args()
    layout = json.loads(GEOMETRY.read_text(encoding='utf-8'))

    if args.source:
        # Validate the pinned master before writing any derivative; normalize() re-reads the
        # same bytes so the hash check and the processed frame cannot diverge.
        digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
        if digest not in SOURCE_PROFILES:
            raise SystemExit(
                f'Rejected source {args.source}: sha256 {digest} has no registered landmark profile.\n'
                f'These piecewise landmarks describe only {EXPECTED_SOURCE_SHA256}; warping a different '
                'master with them would move real boundaries away from the shipped geometry. '
                'Re-measure the source-native landmarks and add a profile in SOURCE_PROFILES first.'
            )
        build_geometry_plate(layout)
        report = normalize(args.source)
        print(json.dumps(report, indent=2))
    else:
        print(build_geometry_plate(layout))


if __name__ == '__main__':
    main()
