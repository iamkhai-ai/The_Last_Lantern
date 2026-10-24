"""Cut the generated level 02 source sheets into runtime sprites.

The model draws each object large on a transparent sheet; this script splits the sheet on transparent
gutters, thresholds away the soft halo, trims each object, downscales it, and pastes it into a fixed
canvas with an explicit anchor. Every size and anchor comes from the V4 runtime layout
(`src/v4/levels/whispering-woods/whisperingWoodsLayout.ts`) and from `docs/implementation/v4/02-whispering-woods-art.md`.

Run: python prepare-assets.py
Outputs: sprites/*.png, previews/*-cut.png, asset-checks.json
"""

from __future__ import annotations

import json
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
    anchor: str = "bottom"  # "bottom", "top" or "place"
    place: tuple[int, int] | None = None
    glyph: str | None = None  # a 1x pixel mark stamped on the cut sprite (see GLYPHS)


@dataclass(frozen=True)
class Sheet:
    """One generated sheet: a file and the sprites, left to right."""

    source: str
    targets: tuple[Target, ...]
    take: tuple[int, ...] | None = None  # object indices to use, when the sheet holds more than the targets


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
    cut_out: list[tuple[Target, Image.Image]] = []
    for (start, end), target in zip(bands, source.targets):
        cut_out.append((target, solid(sheet.crop((start, 0, end, sheet.height)))))
    return cut_out


def fit(image: Image.Image, target: Target) -> Image.Image:
    """Downscale into the target box, then place on the canvas at the target anchor."""
    scale = min(target.width / image.width, target.height / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    small = image.resize(size, Image.LANCZOS)

    # Binary alpha keeps the silhouette crisp at game scale; the palette stays inside one family.
    alpha = small.getchannel("A").point(lambda value: 255 if value >= ALPHA_CUTOFF else 0)
    rgb = small.convert("RGB").quantize(colors=MAX_COLOURS, method=Image.MEDIANCUT).convert("RGB")
    small = rgb.convert("RGBA")
    small.putalpha(alpha)

    canvas_w, canvas_h = target.canvas or (target.width, target.height)
    if target.anchor == "place" and target.place is not None:
        x, y = target.place
    else:
        x = (canvas_w - small.width) // 2
        y = 0 if target.anchor == "top" else canvas_h - small.height
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


def preview(items: list[tuple[Target, Image.Image]], name: str) -> None:
    """A nearest-neighbour blow-up on the forest floor tone, for eyeballing the cut sprites."""
    scale = 8
    pad = 10
    width = sum(image.width * scale + pad for _, image in items) + pad
    height = max(image.height * scale for _, image in items) + pad * 2
    sheet = Image.new("RGBA", (width, height), (24, 34, 36, 255))
    x = pad
    for _, image in items:
        big = image.resize((image.width * scale, image.height * scale), Image.NEAREST)
        sheet.alpha_composite(big, (x, height - pad - big.height))
        x += big.width + pad
    sheet.save(os.path.join(PREVIEWS, name))


def main() -> None:
    os.makedirs(SPRITES, exist_ok=True)
    os.makedirs(PREVIEWS, exist_ok=True)
    checks: list[dict[str, object]] = []
    for source in SHEETS:
        items: list[tuple[Target, Image.Image]] = []
        for target, art in cut(source):
            sprite = fit(art, target)
            if target.glyph is not None:
                sprite = stamp(sprite, target.glyph)
            sprite.save(os.path.join(SPRITES, f"{target.id}.png"))
            bbox = sprite.getchannel("A").getbbox()
            checks.append(
                {
                    "id": target.id,
                    "file": f"sprites/{target.id}.png",
                    "source": f"sources/{source.source}",
                    "canvas": list(sprite.size),
                    "trim": list(art.size),
                    "ink_bbox": list(bbox) if bbox else None,
                    "ink_size": [bbox[2] - bbox[0], bbox[3] - bbox[1]] if bbox else None,
                    "colours": len(sprite.getcolors(maxcolors=1 << 20) or []),
                }
            )
            items.append((target, sprite))
        preview(items, f"{os.path.splitext(source.source)[0]}-cut.png")
    with open(os.path.join(HERE, "asset-checks.json"), "w", encoding="utf-8") as handle:
        json.dump({"checks": checks}, handle, indent=2)
        handle.write("\n")
    for check in checks:
        print(
            f"{check['id']:<14} canvas={check['canvas']} ink={check['ink_size']} colours={check['colours']}"
        )


if __name__ == "__main__":
    main()
