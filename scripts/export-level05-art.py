"""Export the approved Level 05 source pack to the existing native sprite contract.

User-authorized technical processing only: alpha cleanup, shared transforms,
palette reduction and anchor registration. Run from any directory with:
    python scripts/export-level05-art.py
Requires Pillow, NumPy and SciPy. Sources remain unchanged.
"""
from pathlib import Path
from hashlib import sha256
import json

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "assets/levels/05-a-path-for-two"
SOURCE = PACK / "redesign-v2"
DEST = PACK / "sprites"
PREVIEW = PACK / "previews"
outputs = {}
recipes = {}


def load(name):
    im = Image.open(SOURCE / (name + ".png")).convert("RGBA")
    pixels = np.array(im)
    # Reject generator haze and detached alpha specks before shrinking.
    labels, _ = ndimage.label(pixels[:, :, 3] >= 64)
    areas = np.bincount(labels.ravel())
    areas[0] = 0
    keep = areas >= max(32, int(areas.max() * 0.002))
    pixels[~keep[labels]] = 0
    return Image.fromarray(pixels)


def crisp(im):
    pixels = np.array(im)
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 96, 255, 0)
    pixels[pixels[:, :, 3] == 0] = 0
    return Image.fromarray(pixels)


def fit(name, box, size, target, position=(0, 0)):
    patch = load(name).crop(box).resize(size, Image.Resampling.BOX)
    canvas = Image.new("RGBA", target)
    canvas.alpha_composite(patch, position)
    outputs[name] = crisp(canvas)
    recipes[name] = dict(sourceBox=box, resized=size, canvas=target, position=position)
    return outputs[name]


def status_colors(base, variant, window=None):
    """Reuse baseline structural pixels; copy only energy colors / glass light."""
    b, v = np.array(base), np.array(variant)
    r, g, blue = [v[:, :, i].astype(float) for i in range(3)]
    mask = (g > r * 1.17) & (blue > r * 1.12) & (g > 90)
    if window:
        x0, y0, x1, y1 = window
        mask[y0:y1, x0:x1] = True
    mask &= b[:, :, 3] > 0
    b[mask, :3] = v[mask, :3]
    return Image.fromarray(b)


# Standing station: same crop and structural silhouette for all three states.
for name in ["call-idle", "call-sent", "call-arrived"]:
    fit(name, (100, 0, 1045, 1374), (38, 47), (40, 48), (1, 0))
for name in ["call-sent", "call-arrived"]:
    outputs[name] = status_colors(outputs["call-idle"], outputs[name], (16, 26, 23, 33))
# At 40x48 the source's cyan lower wings merged with its upper wings in the sent
# state. Keep the lower half of the idle engraving gold until real arrival.
sent = np.array(outputs["call-sent"])
idle = np.array(outputs["call-idle"])
sent[15:23, 12:28] = idle[15:23, 12:28]
outputs["call-sent"] = Image.fromarray(sent)
recipes["call-sent"]["stateCue"] = "upper wings cyan; lower wings retain idle gold"
recipes["call-arrived"]["stateCue"] = "all four wings cyan on real arrival"

# Floor plates: shared rim anchor despite the source pair's one-pixel size difference.
for name in ["pressure-empty", "pressure-occupied"]:
    fit(name, (50, 62, 1520, 960), (44, 28), (44, 28))
outputs["pressure-occupied"] = status_colors(outputs["pressure-empty"], outputs["pressure-occupied"])

# Lever states share the same pivot at source (648,727), exported near native (14,17).
# A single common source crop retains both handle extremes without independent recentering.
for name in ["latch-unlatched", "latch-latched"]:
    fit(name, (137, 114, 1113, 1270), (27, 32), (28, 32), (0, 0))

# Three-piece horizontal registration fits the artwork's thick posts to the existing
# 10px collision columns, leaving the 44px clear passage unchanged.
def gate(name):
    src = load(name)
    out = Image.new("RGBA", (64, 88))
    for sx0, sx1, dx, width in [(0, 267, 0, 10), (267, 803, 10, 44), (803, 1070, 54, 10)]:
        out.alpha_composite(src.crop((sx0, 0, sx1, 1470)).resize((width, 88), Image.Resampling.BOX), (dx, 0))
    outputs[name] = crisp(out)
    recipes[name] = dict(canvas=[64, 88], sourceX=[0, 267, 803, 1070], nativeX=[0, 10, 54, 64], baseY=88)


for name in ["door-open", "door-closed", "door-held-overlay"]:
    gate(name)
opened = np.array(outputs["door-open"])
# Lower decorative roots cannot spill into the authored clear passage.
opened[44:, 10:54] = 0
outputs["door-open"] = Image.fromarray(opened)
closed = np.array(outputs["door-closed"])
# Identify the transparent arch opening from below, bounded to the passage.
hole = opened[:, :, 3] == 0
hole[:, :10] = False
hole[:, 54:] = False
hole[:24] = False
labels, _ = ndimage.label(hole)
opening = labels == labels[87, 32]
closed[~opening] = opened[~opening]
outputs["door-closed"] = Image.fromarray(closed)
brace = np.array(outputs["door-held-overlay"])
brace[:, 10:54] = 0
outputs["door-held-overlay"] = Image.fromarray(brace)

# Pipe and cable centerlines are fixed at y16 / y20, with no transparent debris.
fit("tube-straight", (0, 350, 1774, 540), (64, 8), (64, 32), (0, 12))
fit("tube-mouth", (170, 88, 1604, 798), (28, 14), (64, 32), (18, 9))
for name in ["root-cable-rest", "root-cable-flow", "root-cable-arrived"]:
    fit(name, (0, 350, 1983, 440), (160, 6), (160, 40), (0, 17))
for name in ["root-cable-flow", "root-cable-arrived"]:
    outputs[name] = status_colors(outputs["root-cable-rest"], outputs[name], (0, 19, 160, 21))

# Authored bends vary in angle. Use the source elbow's junction as a compact
# coupling cap, without its fixed 90-degree arms implying a false route.
fit("tube-elbow", (530, 260, 850, 580), (10, 10), (64, 32), (27, 11))
cap = np.array(outputs["tube-elbow"])
yy, xx = np.ogrid[:32, :64]
cap[(xx - 31.5) ** 2 + (yy - 15.5) ** 2 > 25] = 0
outputs["tube-elbow"] = Image.fromarray(cap)
recipes["tube-elbow"]["note"] = "10px compact junction cap; center (32,16), no fixed-angle arms"

# Both ink states share exactly the same paint geometry. Bright-lantern state is
# genuinely translucent, rather than opaque dark paint that stays visible.
fit("ink-route-dark", (13, 312, 2160, 442), (240, 14), (240, 48), (0, 17))
fit("ink-route-bright", (13, 312, 2160, 442), (240, 14), (240, 48), (0, 17))
dark = np.array(outputs["ink-route-dark"])
bright = np.array(outputs["ink-route-bright"])
bright[:, :, 3] = np.where(dark[:, :, 3] > 0, 28, 0)
bright[bright[:, :, 3] == 0] = 0
outputs["ink-route-bright"] = Image.fromarray(bright)
recipes["ink-route-bright"]["alpha"] = "28/255 on the shared dark-route silhouette"

# Engraving is centered on a common 40px canvas; runtime displays its existing 30px slot.
fit("swirl-memory-scratch", (200, 176, 1054, 1090), (34, 36), (40, 40), (3, 2))

# One restrained 96-color palette keeps all native exports coherent; no dithering.
atlas = Image.new("RGB", (240, len(outputs) * 88))
for index, im in enumerate(outputs.values()):
    atlas.paste(im.convert("RGB"), (0, index * 88))
palette = atlas.quantize(colors=96, method=Image.Quantize.MEDIANCUT)
DEST.mkdir(exist_ok=True)
PREVIEW.mkdir(exist_ok=True)
records = []
for name, im in outputs.items():
    alpha = im.getchannel("A")
    im = im.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
    im.putalpha(alpha)
    pixels = np.array(im)
    pixels[pixels[:, :, 3] == 0] = 0
    im = Image.fromarray(pixels)
    im.save(DEST / (name + ".png"), optimize=True)
    outputs[name] = im
    records.append({
        "file": name + ".png",
        "sourceSha256": sha256((SOURCE / (name + ".png")).read_bytes()).hexdigest(),
        "nativeSha256": sha256((DEST / (name + ".png")).read_bytes()).hexdigest(),
        "size": list(im.size),
        "alphaExtrema": list(alpha.getextrema()),
        "recipe": recipes[name],
    })

manifest = {
    "schemaVersion": 1, "sourceDirectory": "redesign-v2", "runtimeDirectory": "sprites",
    "assetCount": len(records), "tool": "scripts/export-level05-art.py",
    "permission": "User authorized scripted technical normalization on 2026-10-19.",
    "paletteColors": 96, "runtimeIntegrated": True, "assets": records,
}
(PACK / "native-v2-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

# Native 4x nearest-neighbor review sheet on a dark floor swatch.
sheet = Image.new("RGB", (1100, 5 * 230), "#172420")
draw = ImageDraw.Draw(sheet)
for index, (name, im) in enumerate(outputs.items()):
    col, row = index % 4, index // 4
    x, y = col * 275, row * 230
    draw.text((x + 8, y + 8), name, fill="#e7d4a7")
    scale = min(4, 250 // im.width, 184 // im.height)
    scaled = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
    sheet.paste(scaled, (x + (275 - scaled.width) // 2, y + 35), scaled)
sheet.save(PREVIEW / "native-v2-contact-sheet.png")
print(json.dumps({"exported": len(records), "nativeBytes": sum((DEST / r["file"]).stat().st_size for r in records)}))
