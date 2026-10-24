"""Verify the level 02 P0 sprites against the V4 runtime layout and build the review previews.

Checks sizes, alpha and anchors; composites the ring over one stele at its three notch positions; and
lays every sprite on the grove layout at 640x360 (shown at 2x) so the fit can be judged in place.

Run: python check-assets.py
Outputs: previews/contact-sheet.png, previews/stele-ring-3-positions.png, previews/grove-640x360-2x.png
Exit code: 0 when every check passes.
"""

from __future__ import annotations

import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(HERE, "sprites")
PREVIEWS = os.path.join(HERE, "previews")

FLOOR = (26, 38, 40, 255)
WALL = (52, 66, 66, 255)

# World rects copied from src/v4/levels/whispering-woods/whisperingWoodsLayout.ts.
STELES = {
    "moon": (160, 140, 28, 28),
    "leaf": (240, 140, 28, 28),
    "star": (320, 140, 28, 28),
    "water": (400, 140, 28, 28),
}
CRANKS = {"x": (206, 262, 16, 16), "y": (286, 262, 16, 16), "z": (366, 262, 16, 16)}
MOUTHS = {
    "moon": (168, 178, 12, 12),
    "leaf": (248, 178, 12, 12),
    "star": (328, 178, 12, 12),
    "water": (408, 178, 12, 12),
}
GATE = (592, 190, 8, 40)
WORLD = (16, 96, 608, 232)
WALLS = ((592, 96, 8, 94), (592, 230, 8, 98))
NOTCH = {"moon": 2, "leaf": 0, "star": 0, "water": 2}  # 0 = N, 1 = SE, 2 = SW

# Canvas placement: the stele art is 28x24 inside a 32x32 canvas anchored at the bottom centre.
STELE_CANVAS = 32
RING_PIVOT = (16, 19)

EXPECTED = {
    "stele-moon": (32, 32),
    "stele-leaf": (32, 32),
    "stele-star": (32, 32),
    "stele-water": (32, 32),
    "ring": (32, 32),
    "crank-x": (16, 16),
    "crank-y": (16, 16),
    "crank-z": (16, 16),
    "gate-closed": (8, 40),
    "gate-open": (8, 40),
    "latch": (8, 8),
    "mouth-moon": (12, 12),
    "mouth-leaf": (12, 12),
    "mouth-star": (12, 12),
    "mouth-water": (12, 12),
}


def load(name: str) -> Image.Image:
    return Image.open(os.path.join(SPRITES, f"{name}.png")).convert("RGBA")


def verify() -> list[str]:
    problems = []
    for name, size in EXPECTED.items():
        path = os.path.join(SPRITES, f"{name}.png")
        if not os.path.exists(path):
            problems.append(f"{name}: missing")
            continue
        sprite = load(name)
        if sprite.size != size:
            problems.append(f"{name}: {sprite.size} != {size}")
        alpha = sprite.getchannel("A")
        if alpha.getbbox() is None:
            problems.append(f"{name}: no opaque pixels")
        if alpha.getextrema()[0] not in (0, 255):
            problems.append(f"{name}: alpha is not binary")
    # Anchors: the stele foot must sit on the canvas floor, the gate leaf on its sill.
    for name in ("stele-moon", "stele-leaf", "stele-star", "stele-water"):
        bbox = load(name).getchannel("A").getbbox()
        if bbox and bbox[3] != STELE_CANVAS:
            problems.append(f"{name}: foot at y{bbox[3]}, expected {STELE_CANVAS}")
    if load("gate-closed").getchannel("A").getbbox()[3] != 40:
        problems.append("gate-closed: leaf does not reach the sill")
    return problems


def stele_with_ring(name: str, notch: int) -> Image.Image:
    stele = load(f"stele-{name}")
    ring = load("ring").rotate(-120 * notch, resample=Image.NEAREST, center=RING_PIVOT)
    return Image.alpha_composite(stele, ring)


def ring_positions() -> None:
    scale = 8
    pad = 12
    cell = STELE_CANVAS * scale
    sheet = Image.new("RGBA", (cell * 3 + pad * 4, cell + pad * 2 + 16), (24, 34, 36, 255))
    for index, notch in enumerate((0, 1, 2)):
        art = stele_with_ring("moon", notch)
        big = art.resize((cell, cell), Image.NEAREST)
        sheet.alpha_composite(big, (pad + index * (cell + pad), pad))
    sheet.save(os.path.join(PREVIEWS, "stele-ring-3-positions.png"))


def grove() -> None:
    scene = Image.new("RGBA", (640, 360), FLOOR)
    scene.alpha_composite(Image.new("RGBA", (WORLD[2], WORLD[3]), (22, 32, 34, 255)), (WORLD[0], WORLD[1]))
    for wall in WALLS:
        scene.alpha_composite(Image.new("RGBA", (wall[2], wall[3]), WALL), (wall[0], wall[1]))

    def place(sprite: Image.Image, rect: tuple[int, int, int, int]) -> None:
        """Bottom-centre anchor inside the rect."""
        x = rect[0] + rect[2] // 2 - sprite.width // 2
        y = rect[1] + rect[3] - sprite.height
        scene.alpha_composite(sprite, (x, y))

    for name, rect in STELES.items():
        place(stele_with_ring(name, NOTCH[name]), rect)
    for name, rect in CRANKS.items():
        place(load(f"crank-{name}"), rect)
    for name, rect in MOUTHS.items():
        scene.alpha_composite(load(f"mouth-{name}"), (rect[0], rect[1]))
    place(load("gate-closed"), GATE)
    scene.resize((1280, 720), Image.NEAREST).save(os.path.join(PREVIEWS, "grove-640x360-2x.png"))


def contact_sheet() -> None:
    scale = 6
    pad = 12
    names = list(EXPECTED)
    widths = [load(name).width * scale for name in names]
    height = max(load(name).height * scale for name in names)
    sheet = Image.new("RGBA", (sum(widths) + pad * (len(names) + 1), height + pad * 2), (24, 34, 36, 255))
    x = pad
    for name in names:
        sprite = load(name)
        big = sprite.resize((sprite.width * scale, sprite.height * scale), Image.NEAREST)
        sheet.alpha_composite(big, (x, height + pad - big.height))
        x += big.width + pad
    sheet.save(os.path.join(PREVIEWS, "contact-sheet.png"))


def main() -> None:
    os.makedirs(PREVIEWS, exist_ok=True)
    problems = verify()
    ring_positions()
    grove()
    contact_sheet()
    if problems:
        for problem in problems:
            print("FAIL", problem)
        raise SystemExit(1)
    print(f"PASS {len(EXPECTED)} sprites, sizes, binary alpha and anchors verified")


if __name__ == "__main__":
    main()
