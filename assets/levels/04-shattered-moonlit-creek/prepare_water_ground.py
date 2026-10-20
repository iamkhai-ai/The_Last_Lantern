"""Deterministic creek water, flagstone ground and bank-rim art for level 04. No generation API is called.

Run from anywhere:  python assets/levels/04-shattered-moonlit-creek/prepare_water_ground.py

Palette comes from the painted backdrop `sprites/creek-scene-base.png` (slate-teal path, deep blue water, pale moon
highlight). Every vertical-flow texture wraps in y, so a `tileSprite` can scroll it forever without a seam; the water
textures are exactly as wide as the river (60 px) so they never tile sideways.
"""
import math
import random
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / 'sprites'

SLATE = [(41, 62, 74), (48, 70, 81), (55, 78, 87), (65, 87, 94), (74, 100, 101)]
MORTAR = (17, 36, 46)
MOSS = [(45, 68, 72), (64, 86, 79), (71, 96, 87)]
WATER = [(5, 12, 26), (9, 24, 46), (11, 38, 71), (17, 54, 94), (26, 72, 112)]
RIVER_W = 60
PERIOD = 64


def save(name, image):
    OUT.joinpath(name).parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT / name)
    return name


def ground_tile(size=64, cells=4, seed=4):
    """Irregular flagstones (wrapped Voronoi) in the backdrop's slate palette, with sparse teal moss at the joints."""
    rng = random.Random(seed)
    step = size // cells
    points = [(cx * step + rng.randrange(4, step - 4), cy * step + rng.randrange(4, step - 4)) for cy in range(cells) for cx in range(cells)]
    tone = [rng.choice(SLATE) for _ in points]
    image = Image.new('RGB', (size, size))
    px = image.load()
    for y in range(size):
        for x in range(size):
            best = second = 1e9
            bi = 0
            for i, (qx, qy) in enumerate(points):
                dx = min(abs(x - qx), size - abs(x - qx))
                dy = min(abs(y - qy), size - abs(y - qy))
                d = math.hypot(dx * 1.15, dy)  # slightly wider than tall: flat flagstones
                if d < best:
                    second, best, bi = best, d, i
                elif d < second:
                    second = d
            edge = second - best
            if edge < 1.6:
                px[x, y] = MORTAR
                continue
            base = tone[bi]
            shade = 0
            if edge < 3.2:
                shade = -8  # inner shadow at the joint
            elif y % size < 3 or (rng.random() < 0.04):
                shade = 6
            px[x, y] = tuple(max(0, min(255, c + shade)) for c in base)
    for _ in range(26):  # moss specks hug the joints
        x, y = rng.randrange(size), rng.randrange(size)
        if px[x, y] == MORTAR:
            continue
        near_joint = any(px[(x + dx) % size, (y + dy) % size] == MORTAR for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if near_joint:
            px[x, y] = rng.choice(MOSS)
            if rng.random() < 0.5:
                px[(x + 1) % size, y] = rng.choice(MOSS)
    return image


def water_deep(width=RIVER_W, period=PERIOD, seed=11):
    """Deep water: vertical current streaks, quantised to five tones. Wraps in y."""
    rng = random.Random(seed)
    phase = [rng.random() * 6.283 for _ in range(width)]
    image = Image.new('RGB', (width, period))
    px = image.load()
    for y in range(period):
        for x in range(width):
            sway = 2.6 * math.sin(6.283 * y / period + x * 0.09)
            u = x + sway
            v = (math.sin(u * 0.55 + phase[x] * 0.15) + 0.6 * math.sin(u * 1.35 + 6.283 * 2 * y / period) + 0.4 * math.sin(6.283 * 3 * y / period + u * 0.2))
            n = (v + 2.0) / 4.0
            # darker toward both banks, lighter along the middle of the current
            edge = min(x, width - 1 - x) / 14.0
            n = n * min(1.0, 0.55 + edge * 0.45)
            px[x, y] = WATER[max(0, min(len(WATER) - 1, int(n * len(WATER))))]
    return image


def streak_layer(width=RIVER_W, period=96, seed=21, count=26, color=(86, 140, 178), tall=(5, 11)):
    """Short bright current dashes with a soft tail; transparent elsewhere. Wraps in y."""
    rng = random.Random(seed)
    image = Image.new('RGBA', (width, period))
    px = image.load()
    for _ in range(count):
        x = rng.randrange(3, width - 3)
        y = rng.randrange(period)
        length = rng.randint(*tall)
        drift = rng.choice((-1, 0, 0, 1))
        for k in range(length):
            alpha = int(210 * (1 - k / length) ** 1.2)
            px[(x + (drift if k > length // 2 else 0)) % width, (y + k) % period] = (*color, alpha)
        if rng.random() < 0.35:  # short side ripple so it reads as water rather than hair
            px[(x + 1) % width, (y + length // 2) % period] = (*color, 120)
    return image


def glint_layer(width=RIVER_W, period=128, seed=31, count=26):
    rng = random.Random(seed)
    image = Image.new('RGBA', (width, period))
    px = image.load()
    for _ in range(count):
        x, y = rng.randrange(2, width - 2), rng.randrange(period)
        bright = rng.choice(((150, 205, 232), (190, 228, 244), (110, 170, 205)))
        px[x, y] = (*bright, 235)
        if rng.random() < 0.4:
            px[(x + 1) % width, y] = (*bright, 120)
            px[x, (y + 1) % period] = (*bright, 90)
    return image


def foam_strip(width=7, period=64, seed=41, flip=False):
    """Pale foam along a river edge, drawn for the west edge and mirrored for the east one. Wraps in y."""
    rng = random.Random(seed)
    image = Image.new('RGBA', (width, period))
    px = image.load()
    reach = [rng.uniform(1.5, 4.5) for _ in range(period)]
    for y in range(period):
        smooth = (reach[y] + reach[(y + 1) % period] + reach[(y - 1) % period]) / 3
        for x in range(width):
            d = x  # 0 at the bank, growing into the water
            if d < smooth:
                a = int(220 * (1 - d / smooth))
                if (x * 3 + y * 5) % 7 == 0:
                    a = int(a * 0.55)
                px[x, y] = (205, 232, 240, a)
    return image.transpose(Image.FLIP_LEFT_RIGHT) if flip else image


def bank_rim(width=10, period=64, seed=51, flip=False):
    """Stone lip of a bank dropping into the water: lit top edge, dark face, soft shadow onto the water. Wraps in y."""
    rng = random.Random(seed)
    image = Image.new('RGBA', (width, period))
    px = image.load()
    wobble = [rng.randint(-1, 1) for _ in range(period)]
    for y in range(period):
        w = (wobble[y] + wobble[(y + 1) % period]) // 2
        lip = 3 + w  # x where the stone ends and the shadowed face starts (from the bank side)
        for x in range(width):
            if x < lip - 2:
                continue  # leave the bank's own paving visible
            if x < lip:
                px[x, y] = (*SLATE[4], 255)  # lit rim
            elif x < lip + 3:
                px[x, y] = (*MORTAR, 255)  # dark vertical face
            else:
                px[x, y] = (*WATER[0], max(0, 150 - (x - lip - 3) * 38))  # contact shadow on the water
        if rng.random() < 0.22 and 0 <= lip - 1 < width:
            px[lip - 1, y] = (*MOSS[2], 255)
    return image.transpose(Image.FLIP_LEFT_RIGHT) if flip else image


def moon_streak(width=22, height=168):
    """Soft vertical moon glitter for additive blending; the game wobbles its alpha and scale."""
    image = Image.new('RGBA', (width, height))
    px = image.load()
    for y in range(height):
        fall = 1 - abs(y - height * 0.35) / (height * 0.65)
        if fall <= 0:
            continue
        spread = 2 + int(7 * fall)
        for x in range(width):
            d = abs(x - width / 2)
            if d <= spread and ((y // 3 + x) % 3 != 0 or d < 2):
                a = int(150 * fall * (1 - d / (spread + 1)))
                px[x, y] = (198, 226, 244, a)
    return image


# --- One painted image: the backdrop re-cut so its chasm mouths sit exactly above the two gameplay rivers ------------
RIVERS = [(244, 304), (396, 456)]
BANK = (16, 88, 624, 310)  # x0, y0, x1, y1 of the paved playfield; everything outside it stays painted
FADE = 14                  # px over which the painted mouth hands over to live water (top) and takes it back (bottom)


def warp_source_x(x):
    """Target column -> column of creek-scene-base.png. Only x < 396 moves: the painted west chasm (x~158-255, moon pool
    ~180-235) is shifted onto river 1, the painted east chasm (x~388-456) already sits on river 2."""
    if x < 166:
        return x
    if x < 244:
        return x - 86                       # shifted slice of the same cliffs (blended into the left part at the seam)
    if x < 304:
        return int(178 + (x - 244) * 62 / 60)  # moon pool window -> river 1
    if x < 396:
        return 280 + (x - 304)              # tree + rock island window, 1:1
    return x


def curb_strip(length, thickness=7, seed=61):
    """A row of irregular kerb stones (lit top edge, dark underside, a little moss) used to frame the paved yard."""
    rng = random.Random(seed)
    strip = Image.new('RGBA', (length, thickness))
    px = strip.load()
    x = 0
    while x < length:
        w = rng.randint(8, 17)
        h = rng.randint(thickness - 2, thickness)
        top = rng.randint(0, thickness - h)
        tone = rng.choice(SLATE[2:])
        for xx in range(x, min(length, x + w)):
            for yy in range(top, top + h):
                c = tone
                if yy == top:
                    c = SLATE[4]
                elif yy >= top + h - 2:
                    c = MORTAR
                elif xx == x or xx == min(length, x + w) - 1:
                    c = tuple(max(0, v - 14) for v in tone)
                px[xx, yy] = (*c, 255)
        if rng.random() < 0.5:
            mx = min(length - 1, x + rng.randrange(w))
            px[mx, top] = (*rng.choice(MOSS), 255)
        x += w - 1
    return strip


def scene_composite(names):
    """640x360 RGBA: the painted frame (top, bottom, margins), flagstone banks, bank rims and soft mouths, with the river
    channels transparent so animated water drawn BEHIND it shows through. One image, one lighting, no seams to guess."""
    painting = Image.open(OUT / 'creek-scene-base.png').convert('RGB')
    frame = Image.new('RGB', painting.size)
    for x in range(painting.width):
        sx = warp_source_x(x)
        col = painting.crop((sx, 0, sx + 1, painting.height))
        if 150 <= x < 166:  # cross-fade the unmoved cliffs into the shifted slice so there is no visible seam
            t = (x - 150) / 16.0
            other = painting.crop((x - 86, 0, x - 85, painting.height))
            col = Image.blend(painting.crop((x, 0, x + 1, painting.height)), other, t)
        frame.paste(col, (x, 0))
    canvas = frame.convert('RGBA')
    x0, y0, x1, y1 = BANK
    ground = Image.open(OUT / names['ground']).convert('RGBA')
    pad = Image.new('RGBA', (x1 - x0, y1 - y0))
    for y in range(0, pad.height, ground.height):
        for x in range(0, pad.width, ground.width):
            pad.alpha_composite(ground, (x, y))
    rng = random.Random(77)
    edge = 9
    pad_a = pad.getchannel('A')
    pad_alpha = pad_a.load()
    ramp_t = [[rng.uniform(1.5, edge) for _ in range(pad.height)] for _ in range(2)]
    ramp_l = [rng.uniform(1.5, edge) for _ in range(pad.width)]
    ramp_b = [rng.uniform(1.5, edge) for _ in range(pad.width)]
    for yy in range(pad.height):
        for xx in range(pad.width):
            d = min(xx - 0, pad.width - 1 - xx, yy, pad.height - 1 - yy)
            if d >= edge:
                continue
            limit = min(ramp_t[0][yy] if xx < pad.width / 2 else ramp_t[1][yy], 99)
            if yy < edge or yy >= pad.height - edge:
                limit = ramp_l[xx] if yy < edge else ramp_b[xx]
            if d < limit * 0.55:
                pad_alpha[xx, yy] = 0
    pad.putalpha(pad_a)
    canvas.alpha_composite(pad, (x0, y0))
    # contact shadows where the painted frame meets the paving
    for i in range(FADE):
        a = int(150 * (1 - i / FADE) ** 2)
        canvas.alpha_composite(Image.new('RGBA', (x1 - x0, 1), (4, 9, 20, a)), (x0, y0 + i))
        canvas.alpha_composite(Image.new('RGBA', (x1 - x0, 1), (4, 9, 20, a)), (x0, y1 - 1 - i))
        canvas.alpha_composite(Image.new('RGBA', (1, y1 - y0), (4, 9, 20, a)), (x0 + i, y0))
        canvas.alpha_composite(Image.new('RGBA', (1, y1 - y0), (4, 9, 20, a)), (x1 - 1 - i, y0))
    # kerb stones frame the yard on all four sides (skipping the river mouths)
    horiz = curb_strip(x1 - x0)
    vert = curb_strip(y1 - y0, seed=62).transpose(Image.ROTATE_90)
    cut = Image.new('L', horiz.size, 255)
    for rx0, rx1 in RIVERS:
        cut.paste(0, (rx0 - x0 - 2, 0, rx1 - x0 + 2, horiz.height))
    top_strip = horiz.copy(); top_strip.putalpha(Image.composite(horiz.getchannel('A'), Image.new('L', horiz.size, 0), cut))
    canvas.alpha_composite(top_strip, (x0, y0 - 3))
    canvas.alpha_composite(top_strip.transpose(Image.FLIP_TOP_BOTTOM), (x0, y1 - 4))
    canvas.alpha_composite(vert, (x0 - 3, y0))
    canvas.alpha_composite(vert.transpose(Image.FLIP_LEFT_RIGHT), (x1 - 4, y0))
    rim = Image.open(OUT / names['rim']).convert('RGBA')
    for rx0, rx1 in RIVERS:
        for y in range(y0 + FADE, y1 - FADE, rim.height):
            canvas.alpha_composite(rim, (rx0 - 3, y))
            canvas.alpha_composite(rim.transpose(Image.FLIP_LEFT_RIGHT), (rx1 - rim.width + 3, y))
    # open the river channels: opaque painted mouth above/below, fully transparent in between
    alpha = canvas.getchannel('A')
    px = alpha.load()
    for rx0, rx1 in RIVERS:
        for x in range(rx0 + 4, rx1 - 4):
            for y in range(y0 - FADE, y1 + FADE):
                if y < y0 + 2:
                    t = max(0.0, (y - (y0 - FADE)) / (FADE + 2))      # 0 at y0-FADE .. 1 at y0+2
                    px[x, y] = min(px[x, y], int(255 * (1 - t)) if y >= y0 - FADE else 255)
                elif y > y1 - 2:
                    t = max(0.0, ((y1 + FADE) - y) / (FADE + 2))
                    px[x, y] = min(px[x, y], int(255 * (1 - t)))
                else:
                    px[x, y] = 0
    canvas.putalpha(alpha)
    return canvas


def water_stack(names, shift=0):
    """What the game draws behind the composite: deep water, flowing streaks, glints, edge foam, moon glitter."""
    layer = Image.new('RGBA', (640, 360), (0, 0, 0, 0))
    deep = Image.open(OUT / names['deep']).convert('RGBA')
    streak = Image.open(OUT / names['streak']).convert('RGBA')
    glint = Image.open(OUT / names['glint']).convert('RGBA')
    foam = Image.open(OUT / names['foam']).convert('RGBA')
    moon = Image.open(OUT / names['moon']).convert('RGBA')
    top, bottom = BANK[1] - FADE, BANK[3] + FADE
    for rx0, rx1 in RIVERS:
        for img, speed in ((deep, 0.5), (streak, 1.0), (glint, 1.6)):
            off = int(shift * speed) % img.height
            for y in range(top - img.height + off, bottom, img.height):
                layer.alpha_composite(img, (rx0, y))
        for y in range(top, bottom, foam.height):
            layer.alpha_composite(foam, (rx0, y))
            layer.alpha_composite(foam.transpose(Image.FLIP_LEFT_RIGHT), (rx1 - foam.width, y))
        layer.alpha_composite(moon, (rx0 + 30 - moon.width // 2, BANK[1] - 4))
    return layer


def preview(names, shift=0):
    base = Image.new('RGBA', (640, 360), (4, 9, 20, 255))
    # clip the water stack to the river channels so the review image shows exactly what the game would show
    mask = Image.new('L', (640, 360), 0)
    for rx0, rx1 in RIVERS:
        mask.paste(255, (rx0, BANK[1] - FADE, rx1, BANK[3] + FADE))
    base.paste(water_stack(names, shift), (0, 0), Image.composite(water_stack(names, shift).getchannel('A'), Image.new('L', (640, 360), 0), mask))
    base.alpha_composite(scene_composite(names))
    return base.convert('RGB')


def main():
    names = {
        'ground': save('creek-ground.png', ground_tile().convert('RGBA')),
        'deep': save('creek-water-deep.png', water_deep().convert('RGBA')),
        'streak': save('creek-water-streaks.png', streak_layer()),
        'glint': save('creek-water-glints.png', glint_layer()),
        'foam': save('creek-water-foam.png', foam_strip()),
        'rim': save('creek-bank-rim.png', bank_rim()),
        'moon': save('creek-moon-streak.png', moon_streak()),
    }
    prev = HERE / 'previews'
    prev.mkdir(exist_ok=True)
    composite = scene_composite(names)
    save('creek-scene-composite.png', composite)
    preview(names, 0).save(prev / 'level04-composite-frame-a-640x360.png')
    preview(names, 17).save(prev / 'level04-composite-frame-b-640x360.png')
    print('wrote', ', '.join(names.values()), '+ creek-scene-composite.png + two preview frames')


if __name__ == '__main__':
    main()
