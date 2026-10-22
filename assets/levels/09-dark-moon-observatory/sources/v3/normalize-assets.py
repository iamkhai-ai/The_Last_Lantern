"""Normalize the generated Level 09 v3 sheets onto the frozen v2 native canvases.

The source art remains untouched. Sheet gutters are located from alpha occupancy;
each extracted cell is cropped to visible pixels, uniformly fitted with nearest
sampling, then placed on the target canvas using its declared anchor.
"""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance

HERE = Path(__file__).resolve().parent
PACKAGE = HERE.parents[1]
ROOT = PACKAGE.parents[2]
V2 = PACKAGE / "asset-manifest-v2.json"
MAP_PATH = HERE / "normalization-map.json"
OUT = PACKAGE / "sprites" / "v3"
NEAREST = Image.Resampling.NEAREST


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_rgba(path: Path, require_alpha: bool = True) -> Image.Image:
    with Image.open(path) as image:
        image.load()
        if require_alpha and "A" not in image.getbands():
            raise ValueError(f"source has no alpha channel: {path}")
        return image.convert("RGBA")


def resize_background(source: Image.Image, target: tuple[int, int]) -> tuple[Image.Image, dict]:
    width, height = target
    scale = max(width / source.width, height / source.height)
    size = (max(width, round(source.width * scale)), max(height, round(source.height * scale)))
    fitted = source.resize(size, NEAREST)
    left, top = (fitted.width - width) // 2, (fitted.height - height) // 2
    return fitted.crop((left, top, left + width, top + height)), {"resize": "nearest-uniform-cover-center-crop", "source_size": list(source.size), "fitted_size": list(size), "crop_origin": [left, top]}


def background_geometry_masks(room: str, contract: dict, mask_name: str) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image, str]:
    """Verify the frozen collision mask; return separate floor/masonry render masks."""
    expected = Image.new("L", tuple(contract["canvas"]), 0)
    draw = ImageDraw.Draw(expected)

    def fill(rect: dict, value: int) -> None:
        draw.rectangle((rect["x"], rect["y"], rect["x"] + rect["width"] - 1, rect["y"] + rect["height"] - 1), fill=value)

    fill(contract["floors"][room], 255)
    for alcove in contract["alcoves"]:
        if alcove["roomId"] == room:
            fill(alcove["threshold"], 255)
    if room == "observatory":
        fill(contract["final_door_head"], 255)
    for wall in contract["walls"][room]:
        fill(wall, 0)
    for alcove in contract["alcoves"]:
        if alcove["roomId"] == room:
            for jamb in alcove["jambs"]:
                fill(jamb, 0)
    mask_path = HERE.parent / "v2" / mask_name
    frozen = Image.open(mask_path).convert("L")
    frozen = frozen.point(lambda p: 255 if p else 0)
    if expected.size != frozen.size:
        raise ValueError(f"frozen {room} floor mask canvas mismatch: {frozen.size} != {expected.size}")
    diff = ImageChops.difference(expected, frozen).getbbox()
    if diff is not None:
        raise ValueError(f"frozen {room} floor mask disagrees with layout contract; diff={diff}")
    floor_layer = Image.new("L", tuple(contract["canvas"]), 0)
    floor_draw = ImageDraw.Draw(floor_layer)
    fill_floor = lambda rect: floor_draw.rectangle((rect["x"], rect["y"], rect["x"] + rect["width"] - 1, rect["y"] + rect["height"] - 1), fill=255)
    fill_floor(contract["floors"][room])
    for alcove in contract["alcoves"]:
        if alcove["roomId"] == room:
            fill_floor(alcove["threshold"])
    masonry = Image.new("L", tuple(contract["canvas"]), 0)
    masonry_draw = ImageDraw.Draw(masonry)
    for wall in contract["walls"][room]:
        masonry_draw.rectangle((wall["x"], wall["y"], wall["x"] + wall["width"] - 1, wall["y"] + wall["height"] - 1), fill=255)
    for alcove in contract["alcoves"]:
        if alcove["roomId"] == room:
            for jamb in alcove["jambs"]:
                masonry_draw.rectangle((jamb["x"], jamb["y"], jamb["x"] + jamb["width"] - 1, jamb["y"] + jamb["height"] - 1), fill=255)
    # The final-door head is a dark architectural recess, not a walkable floor surface.
    for y in range(floor_layer.height):
        for x in range(floor_layer.width):
            if masonry.getpixel((x, y)):
                floor_layer.putpixel((x, y), 0)
    allowed = ImageChops.lighter(floor_layer, masonry)
    return frozen, floor_layer, masonry, allowed, sha(mask_path)


def texture_patch(source: Image.Image, sample: list[int], target_size: tuple[int, int], offset: tuple[int, int] = (0, 0)) -> Image.Image:
    """Crop the source material to the target aspect, then scale uniformly with nearest pixels."""
    sx, sy, sw, sh = sample
    region = source.crop((sx, sy, sx + sw, sy + sh))
    ratio = target_size[0] / target_size[1]
    if region.width / region.height > ratio:
        crop_w = max(1, round(region.height * ratio))
        max_left = max(0, region.width - crop_w)
        left = min(max_left, max(0, (max_left // 2 + offset[0]) % (max_left + 1)))
        region = region.crop((left, 0, left + crop_w, region.height))
    else:
        crop_h = max(1, round(region.width / ratio))
        max_top = max(0, region.height - crop_h)
        top = min(max_top, max(0, (max_top // 2 + offset[1]) % (max_top + 1)))
        region = region.crop((0, top, region.width, top + crop_h))
    return region.resize(target_size, NEAREST)


def compose_exact_room_background(source: Image.Image, room: str, contract: dict, map_info: dict, mask_name: str) -> tuple[Image.Image, dict]:
    """Transfer generated floor and masonry materials onto exact frozen geometry masks."""
    source_view, resize_meta = resize_background(source, tuple(contract["canvas"]))
    walkable, floors, masonry, allowed, mask_sha = background_geometry_masks(room, contract, mask_name)
    image = Image.new("RGBA", tuple(contract["canvas"]), (11, 20, 32, 255))
    floor_sample = map_info[room]["floor_sample"]
    wall_sample = map_info[room]["wall_sample"]

    floor_rects = [contract["floors"][room]] + [a["threshold"] for a in contract["alcoves"] if a["roomId"] == room]
    for i, rect in enumerate(floor_rects):
        patch = texture_patch(source_view, floor_sample, (rect["width"], rect["height"]), (rect["x"] + i * 31, rect["y"] + i * 17))
        tone = map_info[room].get("floor_tone", {})
        patch = ImageEnhance.Contrast(patch).enhance(tone.get("contrast", 1.0))
        patch = ImageEnhance.Brightness(patch).enhance(tone.get("brightness", 1.0))
        image.alpha_composite(patch.convert("RGBA"), (rect["x"], rect["y"]))
    for rect in contract["walls"][room]:
        patch = texture_patch(source_view, wall_sample, (rect["width"], rect["height"]), (rect["x"] * 7 + rect["y"], rect["y"] * 3 + rect["x"]))
        image.alpha_composite(patch.convert("RGBA"), (rect["x"], rect["y"]))
    for alcove in contract["alcoves"]:
        if alcove["roomId"] != room:
            continue
        for rect in alcove["jambs"]:
            # Jambs are part of the wall model, even where a floor opening touches them.
            patch = texture_patch(source_view, wall_sample, (rect["width"], rect["height"]), (rect["x"] * 5, rect["y"] * 2))
            image.alpha_composite(patch.convert("RGBA"), (rect["x"], rect["y"]))
    draw = ImageDraw.Draw(image)
    for x, y, width, height in contract["hud_bands"]:
        draw.rectangle((x, y, x + width - 1, y + height - 1), fill=(11, 20, 32, 255))
    return image, {**resize_meta, "floor_mask": mask_name, "floor_mask_sha256": mask_sha, "source_floor_sample": floor_sample, "source_masonry_sample": wall_sample, "floor_tone": map_info[room].get("floor_tone", {"brightness": 1.0, "contrast": 1.0}), "geometry_mask": "source floor pixels placed only in frozen floors/alcove thresholds; source masonry pixels placed only in frozen wall/jamb rectangles; final door recess stays void", "walkable_pixel_count": sum(1 for p in walkable.getdata() if p), "floor_pixel_count": sum(1 for p in floors.getdata() if p), "masonry_pixel_count": sum(1 for p in masonry.getdata() if p), "geometry_pixel_count": sum(1 for p in allowed.getdata() if p), "hud_bands_forced": contract["hud_bands"]}


def separators(alpha: Image.Image, count: int, axis: int) -> list[int]:
    """Find low-alpha gutters near even cell boundaries without trusting grid pixels."""
    extent = alpha.width if axis == 0 else alpha.height
    if count == 1:
        return [0, extent]
    projection = []
    for pos in range(extent):
        strip = alpha.crop((pos, 0, pos + 1, alpha.height)) if axis == 0 else alpha.crop((0, pos, alpha.width, pos + 1))
        projection.append(sum(strip.getdata()) // max(1, strip.width * strip.height))
    cuts = [0]
    previous = 0
    for slot in range(1, count):
        ideal = round(extent * slot / count)
        radius = max(2, round(extent * 0.18 / count))
        lo = max(previous + 1, ideal - radius)
        hi = min(extent - (count - slot), ideal + radius)
        cut = min(range(lo, hi + 1), key=lambda i: ((projection[i - 1] + projection[i]) / 2, abs(i - ideal), i))
        cuts.append(cut)
        previous = cut
    cuts.append(extent)
    return cuts


def cells(image: Image.Image, cols: int, rows: int, occupancy: Image.Image | None = None) -> tuple[list[Image.Image], list[list[int]]]:
    alpha = occupancy if occupancy is not None else image.getchannel("A")
    xs = separators(alpha, cols, 0)
    ys = separators(alpha, rows, 1)
    result, bounds = [], []
    for row in range(rows):
        for col in range(cols):
            rect = (xs[col], ys[row], xs[col + 1], ys[row + 1])
            cell = image.crop(rect)
            occupancy_cell = alpha.crop(rect)
            bbox = occupancy_cell.getbbox()
            if not bbox:
                raise ValueError(f"empty source cell at row={row}, col={col}, bounds={rect}")
            result.append(cell.crop(bbox))
            bounds.append([*rect, *bbox])
    return result, bounds


def region_frames(image: Image.Image, occupancy: Image.Image, regions: list[list[int]]) -> tuple[list[Image.Image], list[list[int]]]:
    """Extract deliberately non-grid source positions using declared search regions."""
    result, bounds = [], []
    for index, (x, y, width, height) in enumerate(regions):
        region = occupancy.crop((x, y, x + width, y + height))
        bbox = region.getbbox()
        if not bbox:
            raise ValueError(f"empty source region at index={index}, rect={(x, y, width, height)}")
        absolute = (x + bbox[0], y + bbox[1], x + bbox[2], y + bbox[3])
        result.append(image.crop(absolute))
        bounds.append([x, y, x + width, y + height, *bbox])
    return result, bounds


def fit_cell(source: Image.Image, target: tuple[int, int], pivot: tuple[float, float], top_pad: int = 0, scale_override: float | None = None) -> tuple[Image.Image, dict]:
    width, height = target
    if top_pad < 0 or top_pad >= height:
        raise ValueError(f"invalid top_pad={top_pad} for target={target}")
    max_w, max_h = width, height - top_pad
    scale = scale_override if scale_override is not None else min(max_w / source.width, max_h / source.height)
    new_size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    fitted = source.resize(new_size, NEAREST)
    canvas = Image.new("RGBA", target, (0, 0, 0, 0))
    left = round((width - fitted.width) * pivot[0])
    top = top_pad + round((height - top_pad - fitted.height) * pivot[1])
    canvas.alpha_composite(fitted, (left, top))
    return canvas, {"source_crop_size": list(source.size), "uniform_scale": scale, "fitted_size": list(new_size), "offset": [left, top], "anchor": list(pivot), "top_pad": top_pad}


def fit_root_bands(source: Image.Image, target: tuple[int, int]) -> tuple[Image.Image, dict]:
    """Map north bank, lane, and south bank independently to the frozen 50/48/50px bands."""
    width, height = target
    if (width, height) != (44, 148):
        raise ValueError(f"root-bed geometry changed unexpectedly: {target}")
    source_bands = [round(source.height * y / height) for y in (0, 50, 98, 148)]
    target_bands = [(0, 50), (50, 98), (98, 148)]
    canvas = Image.new("RGBA", target, (0, 0, 0, 0))
    records = []
    for index, (top, bottom) in enumerate(zip(source_bands, source_bands[1:])):
        region = source.crop((0, top, source.width, max(top + 1, bottom)))
        band_height = target_bands[index][1] - target_bands[index][0]
        pivot = (0.5, 0.5)
        fitted, meta = fit_cell(region, (width, band_height), pivot)
        canvas.alpha_composite(fitted, (0, target_bands[index][0]))
        records.append({"source_y": [top, bottom], "target_rect": [0, target_bands[index][0], width, band_height], **meta})
    return canvas, {"root_mapping": "nearest uniform-fit north/lane/south source regions into exact frozen geometry bands", "lane_relative_y": [50, 98], "band_mapping": records}


def normalize() -> dict:
    old = json.loads(V2.read_text(encoding="utf-8"))
    contract = json.loads((HERE / "layout-contract.json").read_text(encoding="utf-8"))
    norm_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    prompts = {item["id"]: item for item in json.loads((HERE / "sprite-prompts.json").read_text(encoding="utf-8"))}
    background_prompts = json.loads((HERE / "background-prompts.json").read_text(encoding="utf-8"))
    if set(prompts) != set(norm_map["sources"]):
        raise ValueError(f"sprite source map and prompt ids differ; unmapped={sorted(set(prompts) - set(norm_map['sources']))}, unused={sorted(set(norm_map['sources']) - set(prompts))}")
    expected = [HERE / info["file"] for info in norm_map["sources"].values()] + [HERE / f"{item['id']}.png" for item in background_prompts]
    missing = [str(p.name) for p in expected if not p.is_file()]
    if missing:
        raise FileNotFoundError("generated source set is incomplete: " + ", ".join(missing))
    OUT.mkdir(parents=True, exist_ok=True)
    source_cache, cut_meta = {}, {}

    def fetch_frame(source_id: str, index: int) -> tuple[Image.Image, dict]:
        if source_id not in source_cache:
            info = norm_map["sources"][source_id]
            path = HERE / info["file"]
            sheet = load_rgba(path)
            cutoff = info.get("alpha_bbox_threshold", 128)
            occupancy = sheet.getchannel("A").point(lambda value: 255 if value >= cutoff else 0)
            prompt = prompts.get(source_id)
            if info.get("frame_regions"):
                frame_list, bounds = region_frames(sheet, occupancy, info["frame_regions"])
            elif prompt:
                frame_list, bounds = cells(sheet, prompt["cols"], prompt["rows"], occupancy)
            else:
                bbox = occupancy.getbbox()
                if not bbox:
                    raise ValueError(f"no source pixels above alpha bbox threshold for {source_id}")
                frame_list, bounds = [sheet.crop(bbox)], [[0, 0, sheet.width, sheet.height, *bbox]]
            source_cache[source_id] = frame_list
            cut_meta[source_id] = {"source": info["file"], "sha256": sha(path), "sheet_size": list(sheet.size), "alpha_bbox_threshold": cutoff, "source_alpha_preserved_within_crop": True, "cells": bounds}
        frames = source_cache[source_id]
        if index < 0 or index >= len(frames):
            raise ValueError(f"frame index {index} outside {source_id} ({len(frames)} frames)")
        return frames[index], cut_meta[source_id]

    def fit_tiled_pipe(source: Image.Image, target: tuple[int, int], orientation: str) -> tuple[Image.Image, dict]:
        """Uniformly scale a straight pipe unit to its cross-axis and repeat along its length."""
        width, height = target
        if orientation == "horizontal":
            scale = height / source.height
            tile_size = (max(1, round(source.width * scale)), height)
        elif orientation == "vertical":
            scale = width / source.width
            tile_size = (width, max(1, round(source.height * scale)))
        else:
            raise ValueError(f"unknown pipe orientation: {orientation}")
        tile = source.resize(tile_size, NEAREST)
        canvas = Image.new("RGBA", target, (0, 0, 0, 0))
        count = 0
        if orientation == "horizontal":
            for x in range(0, width, tile.width):
                canvas.alpha_composite(tile.crop((0, 0, min(tile.width, width - x), height)), (x, 0))
                count += 1
            box = canvas.getchannel("A").getbbox()
            span, target_length = (box[2] - box[0] if box else 0), width
        else:
            for y in range(0, height, tile.height):
                canvas.alpha_composite(tile.crop((0, 0, width, min(tile.height, height - y))), (0, y))
                count += 1
            box = canvas.getchannel("A").getbbox()
            span, target_length = (box[3] - box[1] if box else 0), height
        return canvas, {"pipe_tiling": {"orientation": orientation, "tile_source_size": list(tile.size), "tile_count": count, "visible_axis_span": span, "target_axis_length": target_length, "source_alpha_preserved": True}}

    def resolve_plan(item: dict) -> dict | None:
        asset_id = item["id"]
        plan = norm_map.get("asset_overrides", {}).get(asset_id) or norm_map.get("assets", {}).get(asset_id)
        if plan is None:
            family_rule = norm_map.get("asset_rules", {}).get(item["family"])
            if family_rule:
                frame = family_rule.get("frames_by_state", {}).get(item.get("state", ""))
                if frame is None and family_rule.get("frame_from_id_suffix"):
                    frame = int(asset_id.rsplit("-", 1)[1])
                if frame is not None:
                    plan = {"source_id": family_rule["source_id"], "frame": frame}
        if plan is None and item.get("family") == "pipe-run":
            plan = {"source_id": "pipe-family", "frame": 0 if item["state"] == "on" else 1, "pipe_orientation": "horizontal"}
        if plan is None and item.get("family") == "pipe-drop":
            plan = {"source_id": "pipe-family", "frame": 2 if item["state"] == "on" else 3, "pipe_orientation": "vertical"}
        if plan is None and asset_id == "observatory-loop-path":
            plan = {"material_background": "observatory-clean-source.png", "mask_source": item["source"]}
        if plan is None and item.get("family") in ("entrance", "corridor", "observatory"):
            plan = {"background": {"entrance": "lobby-clean-source.png", "corridor": "corridor-clean-source.png", "observatory": "observatory-clean-source.png"}[item["family"]], "floor_mask": item["family"] + "-floor-mask.png"}
        return plan

    plans = {item["id"]: resolve_plan(item) for item in old["assets"]}
    shared_scales: dict[tuple, float] = {}
    for item in old["assets"]:
        plan = plans[item["id"]]
        if not plan or not plan.get("source_id") or item.get("family") == "root-bed":
            continue
        frame, _ = fetch_frame(plan["source_id"], plan["frame"])
        fit_target = tuple(plan.get("fit_box", item["size"]))
        top_pad = plan.get("top_pad", 0)
        key = (plan["source_id"], fit_target, top_pad)
        scale = min(fit_target[0] / frame.width, (fit_target[1] - top_pad) / frame.height)
        shared_scales[key] = min(shared_scales.get(key, scale), scale)

    records = []
    for item in old["assets"]:
        asset_id = item["id"]
        plan = plans[asset_id]
        target = tuple(item["size"])
        pivot = tuple(item["pivot"])
        if plan and plan.get("source_id"):
            crop, sheet_info = fetch_frame(plan["source_id"], plan["frame"])
            fit_target = tuple(plan.get("fit_box", target))
            if item.get("family") == "root-bed":
                image, fit_meta = fit_root_bands(crop, target)
            elif plan.get("pipe_orientation"):
                image, fit_meta = fit_tiled_pipe(crop, target, plan["pipe_orientation"])
                fit_meta["pipe_tiling"].update({"source_frame": plan["frame"], "state": item["state"]})
            else:
                scale_key = (plan["source_id"], fit_target, plan.get("top_pad", 0))
                image, fit_meta = fit_cell(crop, fit_target, pivot, plan.get("top_pad", 0), shared_scales[scale_key])
                fit_meta["shared_family_scale"] = True
            if image.size != target:
                padded = Image.new("RGBA", target, (0, 0, 0, 0))
                offset = tuple(plan.get("pad_offset", (0, 0)))
                padded.alpha_composite(image, offset)
                image = padded
                fit_meta["canvas_padding"] = {"offset": list(offset), "content_canvas": list(fit_target), "target_canvas": list(target)}
            source_rel = f"assets/levels/09-dark-moon-observatory/sources/v3/{sheet_info['source']}"
            source_hash = sheet_info["sha256"]
            operations = {"kind": "generated-sheet-frame", "source_id": plan["source_id"], "frame": plan["frame"], "cell_bounds": sheet_info["cells"][plan["frame"]], **fit_meta}
            if plan.get("content_rect"):
                operations["content_rect"] = plan["content_rect"]
        elif plan and plan.get("background"):
            bg_name = plan["background"]
            path = HERE / bg_name
            source = load_rgba(path, require_alpha=False)
            image, background_meta = compose_exact_room_background(source, item["family"], contract, norm_map["background_samples"], plan["floor_mask"])
            source_rel, source_hash = f"assets/levels/09-dark-moon-observatory/sources/v3/{bg_name}", sha(path)
            operations = {"kind": "generated-clean-background", **background_meta, "floor_mask": f"assets/levels/09-dark-moon-observatory/sources/v2/{plan['floor_mask']}"}
        elif plan and plan.get("material_background"):
            bg_name = plan["material_background"]
            path = HERE / bg_name
            source = load_rgba(path, require_alpha=False)
            source_view, resize_meta = resize_background(source, tuple(contract["canvas"]))
            room = "observatory"
            sample_info = norm_map["background_samples"][room]
            rect = tuple(target)
            image = texture_patch(source_view, sample_info["floor_sample"], rect, (item.get("layout_rect", {}).get("x", 0), item.get("layout_rect", {}).get("y", 0)))
            tone = sample_info.get("floor_tone", {})
            image = ImageEnhance.Contrast(image).enhance(tone.get("contrast", 1.0))
            image = ImageEnhance.Brightness(image).enhance(tone.get("brightness", 1.0))
            mask_path = ROOT / plan["mask_source"]
            mask_image = load_rgba(mask_path)
            if mask_image.size != target:
                raise ValueError(f"material derivative mask size mismatch for {asset_id}: {mask_image.size} != {target}")
            image.putalpha(mask_image.getchannel("A"))
            source_rel, source_hash = f"assets/levels/09-dark-moon-observatory/sources/v3/{bg_name}", sha(path)
            operations = {"kind": "generated-material-mask-derivative", "texture_sample": sample_info["floor_sample"], "floor_tone": tone, "mask_source_v2": plan["mask_source"], "mask_source_v2_sha256": sha(mask_path), "mask_alpha_preserved": True, **resize_meta}
        else:
            # Explicit reuse is limited to v2 minor stamps, overlays, memory derivatives,
            # thresholds and exact reused actor frames. The source is never rewritten.
            source_rel = plan["source"] if plan and plan.get("source") else item["source"]
            if item.get("family") not in norm_map["explicit_v2_reuse"]["allowed_families"]:
                raise ValueError(f"unmapped asset family cannot silently reuse v2: {asset_id} ({item.get('family')})")
            source_path = ROOT / source_rel
            image = load_rgba(source_path)
            if image.size != target:
                raise ValueError(f"reused source size mismatch for {asset_id}: {image.size} != {target}")
            source_hash = sha(source_path)
            operations = {"kind": "explicit-v2-source-reuse", "reason": (plan or {}).get("reason", "historical minor effect or transparent derivative"), "source_v2_sha256": source_hash}

        if item["kind"] == "background":
            image = image.convert("RGBA")
        elif plan and plan.get("source_id") and image.getchannel("A").getextrema()[0] == 255:
            raise ValueError(f"normalized sprite unexpectedly opaque: {asset_id}")
        out = OUT / f"{asset_id}.png"
        image.save(out, optimize=False)
        rec = dict(item)
        authoring = "generated source normalized with recorded nearest-neighbor operations" if operations["kind"].startswith("generated-") else "explicit historical source raster reused with unchanged pixels"
        rec.update(path=f"assets/levels/09-dark-moon-observatory/sprites/v3/{out.name}", source=source_rel, sha256=sha(out), source_sha256=source_hash, authoring=authoring, normalization=operations)
        records.append(rec)

    return {"assets": records, "source_sheets": cut_meta, "layout_contract_sha256": sha(HERE / "layout-contract.json")}


def main() -> int:
    try:
        result = normalize()
        out = PACKAGE / "asset-manifest-v3.json"
        prior = json.loads(V2.read_text(encoding="utf-8"))
        reused_assets = [{"id": a["id"], "source": a["source"], "source_sha256": a["source_sha256"], "reason": a["normalization"].get("reason")} for a in result["assets"] if a["normalization"]["kind"] == "explicit-v2-source-reuse"]
        manifest = {"schema_version": 3, "created_at": "2026-10-22", "scope": "offline Level 09 scenario-v2 redraw v3", "authority": [{"file": p, "sha256": sha(ROOT / p)} for p in ("docs/scenario-v2/09-dark-moon-observatory.md", "docs/implementation/09-layout.md", "src/data/observatoryLayout.ts", "src/data/observatoryRooms.ts")], "style_authority": {"file": "assets/levels/09-dark-moon-observatory/sources/v3/art-direction.md", "sha256": sha(HERE / "art-direction.md")}, "layout_contract": "assets/levels/09-dark-moon-observatory/sources/v3/layout-contract.json", "layout_contract_sha256": result["layout_contract_sha256"], "normalization_map": "assets/levels/09-dark-moon-observatory/sources/v3/normalization-map.json", "normalization_map_sha256": sha(MAP_PATH), "color_source": "generated source art, guided by art-direction.md; no machine palette or exact color match is asserted", "native_canvas_policy": "native dimensions and pivots are carried from the frozen v2 manifest; every resize/crop/pad is recorded per asset", "engine_integration": "NOT_RUN: offline assets only", "approval": "PENDING visual review", "assets": result["assets"], "source_sheets": result["source_sheets"], "reused": reused_assets, "reused_policy": "only explicitly mapped Level 09 v2 floor/path/threshold/memory layers; the observatory loop path uses generated floor material under its unchanged v2 alpha mask"}
        out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        prompts = json.loads((HERE / "sprite-prompts.json").read_text(encoding="utf-8"))
        bg_prompts = json.loads((HERE / "background-prompts.json").read_text(encoding="utf-8"))
        source_records = []
        # Preserve the factual generation-call records collected by the root task.
        # The two recorder formats differ, so normalize only the fields we can verify.
        generation_records = {}
        for record in json.loads((HERE / "generation-results-primary.json").read_text(encoding="utf-8")).get("results", []):
            generation_records[record["id"]] = {"record_file": "generation-results-primary.json", "tool": record.get("tool", "image_gen"), "status": record.get("status"), "output_size": record.get("size"), "output_mode": record.get("mode"), "recorded_sha256": record.get("sha256"), "recorded_prompt_sha256": hashlib.sha256(record.get("prompt", "").encode("utf-8")).hexdigest()}
        for record in json.loads((HERE / "generation-results-secondary.json").read_text(encoding="utf-8")).get("records", []):
            output = record.get("output", {})
            generation_records[record["id"]] = {"record_file": "generation-results-secondary.json", "tool": record.get("tool", {}).get("name"), "status": record.get("status"), "output_size": [output.get("width"), output.get("height")], "output_mode": output.get("mode"), "recorded_sha256": record.get("source_sha256"), "recorded_prompt_sha256": hashlib.sha256(record.get("prompt", "").encode("utf-8")).hexdigest(), "alpha_metadata": {key: output.get(key) for key in ("alpha_min", "alpha_max", "transparent_pixels", "fully_transparent_pixels", "opaque_pixels", "partial_alpha_pixels", "subject_bbox_alpha_ge_128") if key in output}}
        for prompt in prompts:
            source = HERE / f"{prompt['id']}.png"
            source_records.append({"id": prompt["id"], "path": f"assets/levels/09-dark-moon-observatory/sources/v3/{source.name}", "sha256": sha(source), "generation": "ImageGen source sheet; see recorded result metadata", "generation_record": generation_records.get(prompt["id"]), "prompt_sha256": hashlib.sha256(prompt["prompt"].encode("utf-8")).hexdigest(), "original_preserved": True, "license": "generated; no separate external license asserted"})
        for prompt in bg_prompts:
            source = HERE / f"{prompt['id']}.png"
            source_records.append({"id": prompt["id"], "path": f"assets/levels/09-dark-moon-observatory/sources/v3/{source.name}", "sha256": sha(source), "generation": "ImageGen clean background; see recorded result metadata", "generation_record": generation_records.get(prompt["id"]), "prompt_sha256": hashlib.sha256(prompt["prompt"].encode("utf-8")).hexdigest(), "original_preserved": True, "license": "generated; no separate external license asserted"})
        provenance = {"schema_version": 3, "scope": "Level 09 offline redraw sources and derivatives", "generated_sources": source_records, "normalization": {"script": "assets/levels/09-dark-moon-observatory/sources/v3/normalize-assets.py", "script_sha256": sha(Path(__file__)), "map": "assets/levels/09-dark-moon-observatory/sources/v3/normalization-map.json", "map_sha256": sha(MAP_PATH), "user_authorized_nearest_neighbor_normalization": True, "outputs": [{"id": a["id"], "path": a["path"], "sha256": a["sha256"], "source": a["source"], "source_sha256": a["source_sha256"], "operation": a["normalization"]["kind"]} for a in result["assets"]]}, "v2_reuse": [{"id": a["id"], "source": a["source"], "source_sha256": a["source_sha256"], "reason": a["normalization"].get("reason")} for a in result["assets"] if a["normalization"]["kind"] == "explicit-v2-source-reuse"], "engine_or_visual_approval": "NOT_GRANTED_BY_PROVENANCE"}
        (PACKAGE / "provenance-v3.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({"result": "PASS", "assets": len(result["assets"]), "manifest": str(out), "engine": "NOT_RUN"}))
        return 0
    except Exception as exc:
        print(json.dumps({"result": "FAIL", "error": f"{type(exc).__name__}: {exc}"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
