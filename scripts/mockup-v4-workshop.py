"""Composite mock-up of the V4 workshop (level 00) at game scale, 640x360 and a 2x preview."""
import sys
from PIL import Image, ImageDraw

ROOT = sys.argv[1]
OUT = sys.argv[2]
ART = f'{ROOT}/assets/prologue/story-v4-art-v1/workshop'
CHAR = f'{ROOT}/assets/character'


def cells(path, cols, rows):
    sheet = Image.open(path).convert('RGBA')
    w, h = sheet.size
    out = []
    for r in range(rows):
        for c in range(cols):
            cell = sheet.crop((c * w // cols, r * h // rows, (c + 1) * w // cols, (r + 1) * h // rows))
            alpha = cell.split()[3].point(lambda a: 255 if a > 24 else 0)
            out.append(cell.crop(alpha.getbbox()))
    return out


def fit(img, height=None, width=None):
    if height:
        width = round(img.width * height / img.height)
    else:
        height = round(img.height * width / img.width)
    return img.resize((width, height), Image.LANCZOS)


def place(canvas, img, foot_x, foot_y):
    """Bottom-centre anchor."""
    canvas.alpha_composite(img, (round(foot_x - img.width / 2), round(foot_y - img.height)))


bg = Image.open(f'{ART}/01-background.png').convert('RGBA').resize((640, 360), Image.LANCZOS)
mother = cells(f'{ART}/02-mother-poses.png', 2, 2)
boatman = cells(f'{ART}/03-boatman-poses.png', 2, 2)
props = cells(f'{ART}/04-repair-props.png', 3, 3)
bench, tray, panel_off, panel_fault, lamp_open, lamp_closed, lamp_lit, ring, map_ = props

nhinh = Image.open(f'{CHAR}/nhinh_up_idle_0.png').convert('RGBA')
nhinh_vis_h = nhinh.getbbox()[3] - nhinh.getbbox()[1]  # visible body height in px (28)

scene = bg.copy()
place(scene, fit(bench, width=58), 300, 206)
place(scene, fit(lamp_open, height=14), 306, 184)
place(scene, fit(tray, width=34), 112, 236)
place(scene, fit(panel_fault, width=22), 552, 172)
place(scene, fit(mother[3], height=nhinh_vis_h + 2), 524, 214)
place(scene, fit(boatman[0], height=nhinh_vis_h + 1), 252, 296)
place(scene, nhinh, 300, 252 + 0)  # 36x42 frame, feet at frame bottom

scene.save(f'{OUT}/workshop-mockup-640.png')
scene.resize((1280, 720), Image.NEAREST).save(f'{OUT}/workshop-mockup-2x.png')

# Overlay: HUD areas and the walkable floor estimate.
debug = scene.copy()
d = ImageDraw.Draw(debug, 'RGBA')
d.rectangle((12, 8, 260, 86), outline=(255, 80, 80, 255), fill=(255, 80, 80, 60))      # mission plate
d.rectangle((0, 333, 639, 359), outline=(255, 80, 80, 255), fill=(255, 80, 80, 60))   # key row
d.rectangle((73, 96, 559, 302), outline=(80, 220, 255, 255))                           # floor estimate
d.rectangle((262, 300, 364, 359), outline=(80, 255, 120, 255))                          # south entrance
debug.resize((1280, 720), Image.NEAREST).save(f'{OUT}/workshop-mockup-debug-2x.png')
print('ok', nhinh_vis_h, [p.size for p in props])
