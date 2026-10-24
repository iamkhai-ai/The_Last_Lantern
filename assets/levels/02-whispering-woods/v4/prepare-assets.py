"""Cut the generated level 02 source sheets into runtime sprites.

The model draws each object large on a transparent sheet; this script splits the sheet on transparent
gutters, thresholds away the soft halo, trims each object, downscales it, and pastes it into a fixed
canvas with an explicit anchor. Three outputs are derived rather than cut: the grove floor plate, the
half-raised gate frame and the effect glow. Every size and anchor comes from the V4 runtime layout
(`src/v4/levels/whispering-woods/whisperingWoodsLayout.ts`) and from
`docs/implementation/v4/02-whispering-woods-art.md`.

Run: python prepare-assets.py
Outputs: sprites/*.png, previews/*-cut.png, asset-checks.json
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "sources")
SPRITES = os.path.join(HERE, "sprites")
PREVIEWS = os.path.join(HERE, "previews")

MAX_COLOURS = 128
ALPHA_CUTOFF = 128

# The stele art sits on the floor inside its 32x32 canvas: 28 wide, 24 tall, bottom centre.
# The ring is a separate layer over the stele face, so it is placed on that face, not on the canvas origin.
STELE_CANVAS = (32, 32)
STELE_BOX = (28, 30)
RING_BOX = (26, 26)
RING_PLACE = (3, 6)

# The floor plate is painted large and dropped onto the layout's world rect. The gain keeps it at the
# brightness the level already used (0x17261f) so the props on top keep their contrast.
FLOOR_SIZE = (608, 232)
FLOOR_GAIN = 0.55

# The gate's half-raised frame: the closed leaf, lifted by half the opening, clipped by the canvas.
GATE_LIFT = 20

GLOW_SIZE = 16
GLOW_COLOUR = (255, 226, 164)

# A 16x16 sprite cannot keep a painted symbol readable once it is downscaled, so the crank hub mark is
# stamped at 1x, the same way the level 01 direction draws geometric symbols in code instead of art.
GLYPH_INK = (214, 164, 66, 255)
GLYPH_EDGE = (36, 22, 12, 255)
GLYPHS: dict[str, tuple[str, ...]] = {
    "x": (
        "1000001",
        "0100010",
        "0010100",
        "0001000",
        "0010100",
        "0100010",
        "1000001",
    ),
    "y": (
        "1000001",
        "0100010",
        "0010100",
        "0001000",
        "0001000",
        "0001000",
        "0001000",
    ),
    "z": (
        "1111111",
        "0000011",
        "0000110",
        "0001100",
        "0011000",
        "0110000",
        "1111111",
    ),
}


@dataclass(frozen=True)
class Target:
    """One sprite cut from a sheet cell."""

    id: str
    width: int
    height: int
    canvas: tuple[int, int] | None = None
    anchor: str = "bottom"  # "bottom", "top", "center" or "place"
    place: tuple[int, int] | None = None
    glyph: str | None = None  # a 1x pixel mark stamped on the cut sprite (see GLYPHS)
    stretch: bool = False  # fill the target box exactly; for a part that must span a fixed run


@dataclass(frozen=True)
class Sheet:
    """One generated sheet: a file and the sprites, left to right."""

    source: str
    targets: tuple[Target, ...]
    take: tuple[int, ...] | None = None  # object indices to use, when the sheet holds more than the targets
    uniform: bool = False  # one shared scale for every target, so an animation's body never changes size


SHEETS: tuple[Sheet, ...] = (
    Sheet(
        "steles.png",
        (
            Target("stele-moon", *STELE_BOX, STELE_CANVAS),
            Target("stele-leaf", *STELE_BOX, STELE_CANVAS),
            Target("stele-star", *STELE_BOX, STELE_CANVAS),
            Target("stele-water", *STELE_BOX, STELE_CANVAS),
        ),
    ),
    Sheet(
        "ring-cranks.png",
        (Target("ring", *RING_BOX, STELE_CANVAS, "place", RING_PLACE),),
        take=(0,),
    ),
    Sheet(
        "cranks.png",
        (
            Target("crank-x", 16, 16, (16, 16), glyph="x"),
            Target("crank-y", 16, 16, (16, 16), glyph="y"),
            Target("crank-z", 16, 16, (16, 16), glyph="z"),
        ),
    ),
    Sheet(
        "gate-latch.png",
        (
            Target("gate-closed", 8, 40, (8, 40)),
            Target("gate-open", 8, 8, (8, 40), "top"),
            Target("latch", 8, 8, (8, 8)),
        ),
    ),
    Sheet(
        "mouths.png",
        (
            Target("mouth-moon", 12, 12, (12, 12)),
            Target("mouth-leaf", 12, 12, (12, 12)),
            Target("mouth-star", 12, 12, (12, 12)),
            Target("mouth-water", 12, 12, (12, 12)),
        ),
    ),
    Sheet(
        "axles.png",
        (
            Target("axle-x", 80, 12, (80, 12), "center", stretch=True),
            Target("axle-y", 80, 12, (80, 12), "center", stretch=True),
            Target("axle-z", 80, 12, (80, 12), "center", stretch=True),
        ),
    ),
    Sheet(
        "crank-marks.png",
        (
            Target("mark-x", 32, 32, (32, 32), "center"),
            Target("mark-y", 32, 32, (32, 32), "center"),
            Target("mark-z", 32, 32, (32, 32), "center"),
        ),
    ),
    Sheet(
        "props.png",
        (
            Target("hollow", 64, 32, (64, 32), "bottom"),
            Target("bell", 16, 20, (16, 20), "center"),
        ),
    ),
    Sheet(
        "firefly.png",
        (
            Target("firefly-0", 8, 8, (8, 8), "center"),
            Target("firefly-1", 8, 8, (8, 8), "center"),
            Target("firefly-2", 8, 8, (8, 8), "center"),
        ),
        uniform=True,
    ),
)


def alpha_columns(image: Image.Image) -> list[tuple[int, int]]:
    """Column ranges that contain ink, split wherever a vertical gutter is fully transparent."""
    alpha = image.getchannel("A")
    width, height = image.size
    columns = []
    run_start = None
    for x in range(width):
        inked = alpha.crop((x, 0, x + 1, height)).getextrema()[1] >= ALPHA_CUTOFF
        if inked and run_start is None:
            run_start = x
        elif not inked and run_start is not None:
            columns.append((run_start, x))
            run_start = None
    if run_start is not None:
        columns.append((run_start, width))
    # Merge runs separated by a hairline gap so one object is never split in two.
    merged: list[list[int]] = []
    for start, end in columns:
        if merged and start - merged[-1][1] <= 6:
            merged[-1][1] = end
        else:
            merged.append([start, end])
    return [(start, end) for start, end in merged]


def solid(image: Image.Image) -> Image.Image:
    """Cut away the soft halo the generator leaves around an object, keeping only its solid body."""
    alpha = image.getchannel("A").point(lambda value: 255 if value >= ALPHA_CUTOFF else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        raise SystemExit("empty object after the alpha threshold")
    body = image.crop(bbox)
    body.putalpha(alpha.crop(bbox))
    return body


def cut(source: Sheet) -> list[tuple[Target, Image.Image]]:
    path = os.path.join(SOURCES, source.source)
    sheet = Image.open(path).convert("RGBA")
    bands = alpha_columns(sheet)
    if source.take is not None:
        bands = [bands[index] for index in source.take]
    if len(bands) != len(source.targets):
        raise SystemExit(
            f"{source.source}: found {len(bands)} objects, expected {len(source.targets)}"
        )
    return [
        (target, solid(sheet.crop((start, 0, end, sheet.height))))
        for (start, end), target in zip(bands, source.targets)
    ]


def quantize(image: Image.Image) -> Image.Image:
    """Binary alpha for a crisp silhouette, then one palette for the whole sprite."""
    alpha = image.getchannel("A").point(lambda value: 255 if value >= ALPHA_CUTOFF else 0)
    rgb = image.convert("RGB").quantize(colors=MAX_COLOURS, method=Image.MEDIANCUT).convert("RGB")
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def fit(image: Image.Image, target: Target, scale: float | None = None) -> Image.Image:
    """Downscale into the target box, then place on the canvas at the target anchor."""
    if scale is None:
        scale = min(target.width / image.width, target.height / image.height)
    size = (target.width, target.height) if target.stretch else (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    small = quantize(image.resize(size, Image.LANCZOS))

    canvas_w, canvas_h = target.canvas or (target.width, target.height)
    if target.anchor == "place" and target.place is not None:
        x, y = target.place
    elif target.anchor == "center":
        x, y = (canvas_w - small.width) // 2, (canvas_h - small.height) // 2
    elif target.anchor == "top":
        x, y = (canvas_w - small.width) // 2, 0
    else:
        x, y = (canvas_w - small.width) // 2, canvas_h - small.height
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    canvas.alpha_composite(small, (x, y))
    return canvas


def stamp(sprite: Image.Image, name: str) -> Image.Image:
    """Draw a crisp 1x mark over the centre of the sprite body, ignoring the post at its foot."""
    rows = GLYPHS[name]
    body = sprite.crop((0, 0, sprite.width, max(1, sprite.height - 4)))
    bbox = body.getchannel("A").getbbox()
    if bbox is None:
        return sprite
    origin_x = (bbox[0] + bbox[2]) // 2 - len(rows[0]) // 2
    origin_y = (bbox[1] + bbox[3]) // 2 - len(rows) // 2
    filled = {
        (origin_x + x, origin_y + y)
        for y, row in enumerate(rows)
        for x, char in enumerate(row)
        if char == "1"
    }
    pixels = sprite.load()
    width, height = sprite.size
    for x, y in filled:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            neighbour = (x + dx, y + dy)
            if neighbour not in filled and 0 <= neighbour[0] < width and 0 <= neighbour[1] < height:
                pixels[neighbour] = GLYPH_EDGE
    for x, y in filled:
        if 0 <= x < width and 0 <= y < height:
            pixels[x, y] = GLYPH_INK
    return sprite


def floor_plate() -> Image.Image:
    """The painted grove floor, dropped to the layout's world rect at the level's existing brightness."""
    image = Image.open(os.path.join(SOURCES, "grove-floor.png")).convert("RGB")
    image = image.resize(FLOOR_SIZE, Image.LANCZOS)
    gain = lambda value: min(255, round(value * FLOOR_GAIN))
    plate = Image.merge("RGB", [channel.point(gain) for channel in image.split()])
    return plate.convert("RGBA")


def gate_half() -> Image.Image:
    """The leaf half raised: the closed sprite lifted by half the opening and clipped by the canvas."""
    closed = Image.open(os.path.join(SPRITES, "gate-closed.png")).convert("RGBA")
    canvas = Image.new("RGBA", closed.size, (0, 0, 0, 0))
    canvas.alpha_composite(closed, (0, -GATE_LIFT))
    return canvas


def glow() -> Image.Image:
    """A soft radial glow for the ring-match and gate effects. Derived, never painted."""
    canvas = Image.new("RGBA", (GLOW_SIZE, GLOW_SIZE), (0, 0, 0, 0))
    pixels = canvas.load()
    centre = (GLOW_SIZE - 1) / 2
    for y in range(GLOW_SIZE):
        for x in range(GLOW_SIZE):
            distance = math.hypot(x - centre, y - centre) / (GLOW_SIZE / 2)
            falloff = max(0.0, 1.0 - distance) ** 2
            if falloff > 0:
                pixels[x, y] = (*GLOW_COLOUR, round(falloff * 255))
    return canvas


def preview(items: list[tuple[Target, Image.Image]], name: str) -> None:
    """A nearest-neighbour blow-up on the forest floor tone, for eyeballing the cut sprites."""
    scale = 6
    pad = 10
    width = sum(image.width * scale + pad for _, image in items) + pad
    height = max(image.height * scale for _, image in items) + pad * 2
    sheet = Image.new("RGBA", (width, height), (18, 26, 28, 255))
    x = pad
    for _, image in items:
        big = image.resize((image.width * scale, image.height * scale), Image.NEAREST)
        sheet.alpha_composite(big, (x, height - pad - big.height))
        x += big.width + pad
    sheet.save(os.path.join(PREVIEWS, name))


def record(checks: list[dict[str, object]], target_id: str, sprite: Image.Image, source: str) -> None:
    bbox = sprite.getchannel("A").getbbox()
    checks.append(
        {
            "id": target_id,
            "file": f"sprites/{target_id}.png",
            "source": source,
            "canvas": list(sprite.size),
            "ink_bbox": list(bbox) if bbox else None,
            "ink_size": [bbox[2] - bbox[0], bbox[3] - bbox[1]] if bbox else None,
            "colours": len(sprite.getcolors(maxcolors=1 << 20) or []),
        }
    )


def main() -> None:
    os.makedirs(SPRITES, exist_ok=True)
    os.makedirs(PREVIEWS, exist_ok=True)
    checks: list[dict[str, object]] = []
    for source in SHEETS:
        items = cut(source)
        shared = None
        if source.uniform:
            widest = max(art.width for _, art in items)
            tallest = max(art.height for _, art in items)
            first = source.targets[0]
            shared = min(first.width / widest, first.height / tallest)
        previews: list[tuple[Target, Image.Image]] = []
        for target, art in items:
            sprite = fit(art, target, shared)
            if target.glyph is not None:
                sprite = stamp(sprite, target.glyph)
            sprite.save(os.path.join(SPRITES, f"{target.id}.png"))
            record(checks, target.id, sprite, f"sources/{source.source}")
            previews.append((target, sprite))
        preview(previews, f"{os.path.splitext(source.source)[0]}-cut.png")

    for target_id, sprite, source in (
        ("grove-floor", floor_plate(), "sources/grove-floor.png"),
        ("gate-half", gate_half(), "derived from sprites/gate-closed.png"),
        ("glow", glow(), "derived"),
    ):
        sprite.save(os.path.join(SPRITES, f"{target_id}.png"))
        record(checks, target_id, sprite, source)

    with open(os.path.join(HERE, "asset-checks.json"), "w", encoding="utf-8") as handle:
        json.dump({"checks": checks}, handle, indent=2)
        handle.write("\n")
    for check in checks:
        print(
            f"{check['id']:<14} canvas={check['canvas']} ink={check['ink_size']} colours={check['colours']}"
        )


if __name__ == "__main__":
    main()
