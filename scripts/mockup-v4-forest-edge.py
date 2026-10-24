"""Blockout of V4 level 01 (forest edge station) at game scale, from the layout JSON (synced to the runtime).

Run from the repo root:  python scripts/mockup-v4-forest-edge.py
Writes docs/implementation/v4/previews/01-forest-edge-blockout.png and -debug.png (both 1280x720).
Placeholder art only: the forest kit, the old stele/lantern sprites and Nhinh/Lumo give scale; every
mechanism (walls, doors, pedestals, latches, brace) is a flat block until the real art exists.
"""
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LAYOUT = json.loads(io.open(ROOT / 'docs/implementation/v4/01-forest-edge-layout.json', encoding='utf8').read())
OUT = ROOT / 'docs/implementation/v4/previews'
SCALE = 2


def sprite(rel, height=None):
    img = Image.open(ROOT / rel).convert('RGBA')
    img = img.crop(img.getbbox())
    if height:
        img = img.resize((max(1, round(img.width * height / img.height)), height), Image.LANCZOS)
    return img


def place(canvas, img, foot_x, foot_y):
    """Bottom-centre anchor."""
    canvas.alpha_composite(img, (round(foot_x - img.width / 2), round(foot_y - img.height)))


def box(r):
    return (r['x'], r['y'], r['x'] + r['width'] - 1, r['y'] + r['height'] - 1)


W = LAYOUT['walls']
I = {k: v['rect'] for k, v in LAYOUT['interactables'].items()}
MARKS = {m['id']: m for m in LAYOUT['lightMarks']}
ROOMS = {r['id']: r['rect'] for r in LAYOUT['rooms']}
scene = Image.new('RGBA', (640, 360), (22, 40, 30, 255))
d = ImageDraw.Draw(scene, 'RGBA')

# Ground: the entry yard is grass; the middle yard is worn paving with faint joints.
yard = ROOMS['entry']
d.rectangle((yard['x'], yard['y'], yard['x'] + yard['width'] - 1, yard['y'] + yard['height'] - 1), fill=(26, 50, 40, 255))
mid = ROOMS['middle']
d.rectangle((mid['x'], mid['y'], mid['x'] + mid['width'] - 1, mid['y'] + mid['height'] - 1), fill=(74, 78, 74, 255))
for y in range(mid['y'] + 4, mid['y'] + mid['height'], 12):
    d.line((mid['x'], y, mid['x'] + mid['width'] - 1, y), fill=(64, 68, 64, 255))

# Walls: collision strip plus a front face drawn above it (every wall in the layout, by its own name).
for r in W.values():
    d.rectangle(box(r), fill=(96, 84, 66, 255))
    d.rectangle((r['x'], r['y'] + r['height'] - 6, r['x'] + r['width'] - 1, r['y'] + r['height'] - 1), fill=(70, 60, 48, 255))

# Mechanisms (flat placeholders).
d.rectangle(box(LAYOUT['doorA']), fill=(122, 92, 52, 255), outline=(40, 28, 16, 255))
d.rectangle(box(LAYOUT['gateB']), fill=(122, 92, 52, 255), outline=(40, 28, 16, 255))
for key in ('s1', 's2'):
    r = I[key]
    d.rectangle((r['x'], r['y'] - 10, r['x'] + r['width'] - 1, r['y'] + r['height'] - 1), fill=(128, 118, 96, 255), outline=(50, 44, 34, 255))
    d.rectangle((r['x'] + 8, r['y'] - 6, r['x'] + 15, r['y'] + 1), fill=(176, 130, 60, 255))  # sealed socket
for key in ('latchA', 'braceB'):
    r = I[key]
    d.rectangle((r['x'] + 4, r['y'] - 14, r['x'] + 11, r['y'] + 15), fill=(160, 120, 70, 255), outline=(50, 34, 16, 255))
r = I['hinge']
d.rectangle(box(r), fill=(110, 96, 70, 255), outline=(40, 30, 20, 255))
r = I['stele']
d.rectangle((r['x'], r['y'] - 6, r['x'] + r['width'] - 1, r['y'] + r['height'] - 1), fill=(89, 102, 106, 255), outline=(40, 46, 48, 255))
# Dark marks: spores and footprints drawn dim so they read as unlit.
for m in LAYOUT['lightMarks']:
    if m['kind'] == 'dark':
        r = m['rect']
        d.rectangle((r['x'], r['y'], r['x'] + r['width'] - 1, r['y'] + r['height'] - 1), fill=(20, 30, 36, 255))
# Lit mark: the sprout Lumo is covering.
r = MARKS['sprout']['rect']
d.ellipse((r['x'], r['y'], r['x'] + r['width'], r['y'] + r['height']), fill=(70, 150, 90, 255))

# Kit sprites for scale.
place(scene, sprite('assets/environment/forest-expansion/sprites-v2/ancient-tree-01.png', 150), 72, 200)
for x, y in ((36, 330), (230, 116), (600, 330), (420, 344), (20, 250)):
    place(scene, sprite('src/assets/bush_woods.png', 34), x, y)
place(scene, sprite('assets/levels/01-forgotten-forest-edge/sprites/beacon-stone-hidden.png', 40), I['stele']['x'] + 14, I['stele']['y'] + 16)
place(scene, sprite('assets/levels/01-forgotten-forest-edge/sprites/pickup-lantern.png', 16), I['lampRest']['x'] + 7, I['lampRest']['y'] + 8)
place(scene, sprite('src/assets/lumo_0.png', 14), r['x'] + 6, r['y'] + 4)
spawn = LAYOUT['checkpoints'][0]['spawn']
place(scene, Image.open(ROOT / 'assets/character/nhinh_down_idle_0.png').convert('RGBA'), spawn['x'], spawn['y'] + 21)

big = scene.resize((640 * SCALE, 360 * SCALE), Image.NEAREST)
labels = ImageDraw.Draw(big, 'RGBA')
try:
    FONT = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 15)
except OSError:  # not on Windows: Vietnamese marks may not render
    FONT = ImageFont.load_default()
TEXT = {
    'bia': (150, 186), 'đèn trên đất': (196, 238), 'bản lề': (100, 254), 'S1': (282, 226), 'cửa A': (330, 160),
    'chốt A': (372, 146), 'S2': (414, 78), 'cổng B': (440, 56), 'hãm B': (512, 78),
    'mầm + Lumo': (200, 294), 'cây lớn': (24, 206), 'Nhinh': (96, 230),
    'SÂN VÀO': (40, 300), 'SÂN GIỮA': (300, 58), '→ rừng 02': (462, 22),
}
for text, (x, y) in TEXT.items():
    labels.text((x * SCALE + 1, y * SCALE + 1), text, font=FONT, fill=(0, 0, 0, 220))
    labels.text((x * SCALE, y * SCALE), text, font=FONT, fill=(255, 240, 180, 255))
OUT.mkdir(parents=True, exist_ok=True)
big.save(OUT / '01-forest-edge-blockout.png')

# Debug: HUD bands, collision, item reach bands, light marks, checkpoints, exit.
dbg = big.copy()
g = ImageDraw.Draw(dbg, 'RGBA')


def rect2(r, **kw):
    g.rectangle((r['x'] * SCALE, r['y'] * SCALE, (r['x'] + r['width']) * SCALE - 1, (r['y'] + r['height']) * SCALE - 1), **kw)


rect2({'x': 12, 'y': 8, 'width': 248, 'height': 78}, outline=(255, 80, 80, 255), fill=(255, 80, 80, 70))
rect2({'x': 0, 'y': 333, 'width': 640, 'height': 27}, outline=(255, 80, 80, 255), fill=(255, 80, 80, 70))
for r in W.values():
    rect2(r, outline=(255, 255, 255, 160))
for key, v in LAYOUT['interactables'].items():
    r = v['rect']
    rect2({'x': r['x'] - 8, 'y': r['y'] - 8, 'width': r['width'] + 16, 'height': r['height'] + 16}, outline=(80, 220, 255, 255))
    rect2(r, outline=(255, 255, 255, 220))
for key in ('doorA', 'gateB'):
    rect2(LAYOUT[key], outline=(255, 160, 40, 255))
for c in LAYOUT['checkpoints']:
    rect2(c['zone'], outline=(80, 255, 120, 255))
rect2(LAYOUT['exitZone'], outline=(255, 240, 60, 255), fill=(255, 240, 60, 60))
for m in LAYOUT['lightMarks']:
    rect2(m['rect'], outline=(255, 0, 255, 255) if m['kind'] == 'dark' else (255, 255, 0, 255))
for p in LAYOUT['pulseMarks']:
    g.ellipse(((p['x'] - 3) * SCALE, (p['y'] - 3) * SCALE, (p['x'] + 3) * SCALE, (p['y'] + 3) * SCALE), outline=(120, 255, 255, 255), width=2)
dbg.save(OUT / '01-forest-edge-blockout-debug.png')
print('ok', OUT)
