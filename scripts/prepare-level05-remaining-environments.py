"""Reproduce relay/ink bases from pinned Sunburst masters; never edit entry or gameplay.

Run: python scripts/prepare-level05-remaining-environments.py
Source landmarks are measured on the native nearest resize. Ink's central masonry needs its
own vertical map: a global warp would incorrectly move the west foyer's short wall with it.
Reuse the entry exporter’s validated nearest/cell-edge registration primitives.
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / 'assets/levels/05-a-path-for-two/environment-v3'
SPRITES = ENV.parent / 'sprites'
spec = importlib.util.spec_from_file_location('entry_environment', Path(__file__).with_name('prepare-level05-entry-environment.py'))
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)

PROFILES = {
    'relay': {
        'sha256': 'f69aa80d2ba6bc3d07dff67be9bfde6f1fc8d635dd9c50032909dc9774802297',
        'x': {'source': [0,24,80,138,440,510,616,640], 'target': [0,24,78,142,448,512,616,640]},
        'y': {'source': [0,80,178,210,305,360], 'target': [0,80,180,210,300,360]},
        'south_repair': [78,142], 'south_floor': [88,132], 'south_wall_y': 300,
    },
    'ink': {
        'sha256': '5b7474297d1e7f4e1dc6d802efebe4eb6c34bc797283c3db9b7b4ef3c1caa0e0',
        'x': {'source': [0,24,42,126,176,504,532,594,616,640], 'target': [0,24,34,130,184,532,542,606,616,640]},
        'y': {'source': [0,80,156,184,305,360], 'target': [0,80,150,180,310,360]},
        'centre_x': [184,532],
        'centre_y': {'source': [0,80,156,184,230,245,305,360], 'target': [0,80,190,218,266,280,310,360]},
        'south_repair': [34,130], 'south_floor': [60,104], 'south_wall_y': 310,
    },
}

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def axis_map(source, target, size):
    """Centre-sampled nearest cells, including bands compressed by more than 2:1.

    Entry's stricter edge-adjacency guarantee cannot hold for such compression. Each target
    band must instead sample only its corresponding source band; entry's exporter is unchanged.
    """
    if len(source) != len(target) or len(source) < 2 or source[0] != 0 or target[0] != 0 or source[-1] != size or target[-1] != size:
        raise ValueError('invalid registration bounds')
    if any(b <= a for values in (source, target) for a, b in zip(values, values[1:])):
        raise ValueError('registration landmarks must increase')
    return [s0 + int((cell + 0.5) * (s1 - s0) / (t1 - t0))
            for s0, s1, t0, t1 in zip(source, source[1:], target, target[1:])
            for cell in range(t1 - t0)]

def normalize(room, source, output):
    profile = PROFILES[room]
    digest = sha256(source)
    if digest != profile['sha256']:
        raise ValueError(f'unregistered source for {room}: {digest}; remeasure before exporting')
    with Image.open(source) as master:
        if abs(master.width / master.height - 16/9) > 0.06:
            raise ValueError('source must be a full 16:9 frame, not a cropped room')
        size = list(master.size)
        icc = master.info.get('icc_profile')
        native = master.convert('RGB').resize((640,360), Image.Resampling.NEAREST)
    maps = {axis: axis_map(profile[axis]['source'], profile[axis]['target'], length)
            for axis, length in (('x',640),('y',360))}
    registered = entry.warp_nearest(native, maps)
    if 'centre_y' in profile:
        central = profile['centre_y']
        centre_map = axis_map(central['source'], central['target'], 360)
        central_image = entry.warp_nearest(native, {'x': maps['x'], 'y': centre_map})
        left, right = profile['centre_x']
        registered.paste(central_image.crop((left,0,right,360)), (left,0))
    # Both raw masters leave the return-slot floor open to the image edge. Rebuild ONLY that
    # small south-wall area from same-row neighbouring masonry, then reserve the real 44px
    # passage to y318. This is paint repair, not a new collider or a fake extra exit.
    left, right = profile['south_repair']
    top = profile['south_wall_y']
    wall_patch = registered.crop((220,top,220+right-left,360))
    passage_left, passage_right = profile['south_floor']
    floor_patch = registered.crop((passage_left,top-(318-top),passage_right,top))
    registered.paste(wall_patch, (left,top))
    registered.paste(floor_patch, (passage_left,top))
    indexed = registered.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    output.parent.mkdir(parents=True, exist_ok=True)
    indexed.save(output, optimize=True, **({'icc_profile':icc} if icc else {}))
    return {
        'room': room, 'source': source.name, 'source_dimensions':size, 'source_sha256':digest,
        'output': output.name, 'output_sha256':sha256(output), 'bytes':output.stat().st_size,
        'size':[640,360], 'mode':'P', 'opaque':True, 'palette_limit':128, 'dither':False,
        'resample':'nearest', 'registration':profile,
        'south_cap': {'y':318,'passage_width':44,'repair_x':[left,right], 'wall_sample_x':220},
        'geometry_sha256':sha256(ENV / f'{room}-geometry.json'),
        'metadata':'Raw master retained byte-for-byte; ICC copied if supplied.',
    }

if __name__ == '__main__':
    for room in ('relay','ink'):
        report = normalize(room, ENV / f'{room}-sunburst-master.png', SPRITES / f'{room}-environment-base.png')
        (ENV / f'{room}-normalization-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
        print(f"{room}: {report['size']} / {report['bytes']} bytes / {report['output_sha256']}")
