"""Offline structural/provenance validation for the Level 09 v3 art package."""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import hashlib
import json
import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance

HERE = Path(__file__).resolve().parent
PACKAGE = HERE.parents[1]
ROOT = PACKAGE.parents[2]
MANIFEST_PATH = PACKAGE / "asset-manifest-v3.json"
REVIEW_PATH = PACKAGE / "review-manifest-v3.json"
PROVENANCE_PATH = PACKAGE / "provenance-v3.json"
CONTRACT_PATH = HERE / "layout-contract.json"
CHECKS: list[dict] = []


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest_matches(data: bytes, expected: str) -> bool:
    return hashlib.sha256(data).hexdigest() == expected


def record(name: str, ok: bool, detail=None) -> None:
    CHECKS.append({"check": name, "result": "PASS" if ok else "FAIL", "detail": detail})


def rect_contains(x: int, y: int, rect: dict) -> bool:
    return rect["x"] <= x < rect["x"] + rect["width"] and rect["y"] <= y < rect["y"] + rect["height"]


def raster_errors(image: Image.Image, expected: tuple[int, int], needs_transparency: bool, allow_opaque_sprite: bool = False) -> list[str]:
    errors = []
    if image.size != expected:
        errors.append("wrong-size")
    if image.mode != "RGBA":
        errors.append("not-rgba")
    if image.mode == "RGBA":
        alpha = image.getchannel("A")
        if alpha.getbbox() is None:
            errors.append("empty")
        if needs_transparency and not allow_opaque_sprite and alpha.getextrema()[0] == 255:
            errors.append("opaque-sprite")
        if not needs_transparency and alpha.getextrema() != (255, 255):
            errors.append("nonopaque-background")
    return errors


def resize_room_source(source: Image.Image, target: tuple[int, int]) -> Image.Image:
    width, height = target
    scale = max(width / source.width, height / source.height)
    fitted = source.resize((max(width, round(source.width * scale)), max(height, round(source.height * scale))), Image.Resampling.NEAREST)
    left, top = (fitted.width - width) // 2, (fitted.height - height) // 2
    return fitted.crop((left, top, left + width, top + height))


def exact_texture_patch(source: Image.Image, sample: list[int], target_size: tuple[int, int], offset: tuple[int, int]) -> Image.Image:
    x, y, width, height = sample
    region = source.crop((x, y, x + width, y + height))
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
    return region.resize(target_size, Image.Resampling.NEAREST).convert("RGBA")


def reconstruct_background(source: Image.Image, room: str, contract: dict, samples: dict) -> Image.Image:
    source_view = resize_room_source(source.convert("RGBA"), tuple(contract["canvas"]))
    expected = Image.new("RGBA", tuple(contract["canvas"]), (11, 20, 32, 255))
    floor_sample, wall_sample = samples[room]["floor_sample"], samples[room]["wall_sample"]
    floor_rects = [contract["floors"][room]] + [a["threshold"] for a in contract["alcoves"] if a["roomId"] == room]
    for i, rect in enumerate(floor_rects):
        patch = exact_texture_patch(source_view, floor_sample, (rect["width"], rect["height"]), (rect["x"] + i * 31, rect["y"] + i * 17))
        tone = samples[room].get("floor_tone", {})
        patch = ImageEnhance.Contrast(patch).enhance(tone.get("contrast", 1.0))
        patch = ImageEnhance.Brightness(patch).enhance(tone.get("brightness", 1.0))
        expected.alpha_composite(patch, (rect["x"], rect["y"]))
    for rect in contract["walls"][room]:
        patch = exact_texture_patch(source_view, wall_sample, (rect["width"], rect["height"]), (rect["x"] * 7 + rect["y"], rect["y"] * 3 + rect["x"]))
        expected.alpha_composite(patch, (rect["x"], rect["y"]))
    for alcove in contract["alcoves"]:
        if alcove["roomId"] == room:
            for rect in alcove["jambs"]:
                patch = exact_texture_patch(source_view, wall_sample, (rect["width"], rect["height"]), (rect["x"] * 5, rect["y"] * 2))
                expected.alpha_composite(patch, (rect["x"], rect["y"]))
    draw = ImageDraw.Draw(expected)
    for x, y, width, height in contract["hud_bands"]:
        draw.rectangle((x, y, x + width - 1, y + height - 1), fill=(11, 20, 32, 255))
    return expected


def main() -> int:
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        review = json.loads(REVIEW_PATH.read_text(encoding="utf-8"))
        provenance = json.loads(PROVENANCE_PATH.read_text(encoding="utf-8"))
        contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
        normalization_map = json.loads((HERE / "normalization-map.json").read_text(encoding="utf-8"))
        old = json.loads((PACKAGE / "asset-manifest-v2.json").read_text(encoding="utf-8"))
    except Exception as exc:
        print(json.dumps({"result": "FAIL", "error": f"{type(exc).__name__}: {exc}"}), file=sys.stderr)
        return 1

    record("schema-and-scope", manifest.get("schema_version") == 3 and "offline" in manifest.get("scope", ""), {"schema_version": manifest.get("schema_version"), "scope": manifest.get("scope")})
    record("no-stale-v2-palette-or-authoring-claims", "palette" not in manifest and "native_scale" not in manifest and all("no production resize" not in a.get("authoring", "") for a in manifest.get("assets", [])))
    record("layout-contract-is-exact-v2-copy", sha(CONTRACT_PATH) == sha(HERE / "../v2/layout-contract.json"), {"sha256": sha(CONTRACT_PATH)})
    record("manifest-contract-hash", manifest.get("layout_contract_sha256") == sha(CONTRACT_PATH))
    record("normalization-map-hash", manifest.get("normalization_map_sha256") == sha(HERE / "normalization-map.json"))
    record("production-brief-hash-recorded", bool(manifest.get("style_authority", {}).get("sha256")) and manifest["style_authority"]["sha256"] == sha(HERE / "art-direction.md"))

    old_authority = {a["file"]: a["sha256"] for a in old.get("authority", [])}
    current_authority = {a["file"]: sha(ROOT / a["file"]) for a in manifest.get("authority", [])}
    record("frozen-authority-hashes", current_authority == old_authority, {"expected": old_authority, "actual": current_authority})
    contract_inputs = {item["file"]: item["sha256"] for item in contract.get("inputs", [])}
    record("layout-contract-frozen-inputs", all(sha(ROOT / p) == digest for p, digest in contract_inputs.items()), {"files": list(contract_inputs)})

    by_id = {a["id"]: a for a in manifest.get("assets", [])}
    prior_ids = {a["id"] for a in old.get("assets", [])}
    record("complete-v2-native-id-coverage", set(by_id) == prior_ids, {"expected": len(prior_ids), "actual": len(by_id), "missing": sorted(prior_ids - set(by_id)), "extra": sorted(set(by_id) - prior_ids)})
    paths = [a["path"] for a in manifest.get("assets", [])]
    record("unique-output-paths", len(paths) == len(set(paths)))
    output_dir = PACKAGE / "sprites" / "v3"
    expected_files = {Path(a["path"]).name for a in manifest.get("assets", [])}
    actual_files = {p.name for p in output_dir.glob("*.png")}
    record("all-output-pngs-are-manifested", expected_files == actual_files, {"missing": sorted(expected_files - actual_files), "unmanifested": sorted(actual_files - expected_files)})

    images = {}
    reuse_allowed = set(normalization_map["explicit_v2_reuse"]["allowed_families"])
    for asset in manifest.get("assets", []):
        path = ROOT / asset["path"]
        try:
            with Image.open(path) as im:
                im.load()
                image = im.convert("RGBA")
            images[asset["id"]] = image
            needs_alpha = asset["kind"] != "background"
            kind = asset.get("normalization", {}).get("kind")
            source = ROOT / asset["source"]
            opaque_reuse = False
            if needs_alpha and kind == "explicit-v2-source-reuse" and source.is_file() and image.getchannel("A").getextrema()[0] == 255:
                with Image.open(source) as original:
                    original.load()
                    opaque_reuse = ImageChops.difference(image, original.convert("RGBA")).getbbox() is None
            if needs_alpha and kind == "generated-material-mask-derivative":
                mask_source = ROOT / asset.get("normalization", {}).get("mask_source_v2", "missing")
                if mask_source.is_file():
                    with Image.open(mask_source) as original_mask:
                        original_mask.load()
                        opaque_reuse = ImageChops.difference(image.getchannel("A"), original_mask.convert("RGBA").getchannel("A")).getbbox() is None
            errors = raster_errors(image, tuple(asset["size"]), needs_alpha, allow_opaque_sprite=opaque_reuse)
            if sha(path) != asset.get("sha256"):
                errors.append("output-hash")
            if not source.is_file() or sha(source) != asset.get("source_sha256"):
                errors.append("source-hash")
            if kind == "explicit-v2-source-reuse" and asset.get("family") not in reuse_allowed:
                errors.append("unapproved-v2-reuse")
            if kind == "generated-sheet-frame" and asset.get("source") == asset.get("path"):
                errors.append("source-output-alias")
            if not all(0 <= n <= 1 for n in asset.get("pivot", [])) or len(asset.get("pivot", [])) != 2:
                errors.append("pivot")
            if errors:
                record("asset:" + asset["id"], False, errors)
            else:
                record("asset:" + asset["id"], True, {"size": list(image.size), "alpha": list(image.getchannel("A").getextrema()), "sha256": asset["sha256"]})
        except Exception as exc:
            record("asset:" + asset.get("id", "unknown"), False, f"{type(exc).__name__}: {exc}")

    source_records = {item["path"]: item for item in provenance.get("generated_sources", [])}
    generated_paths = {asset["source"] for asset in manifest.get("assets", []) if asset.get("normalization", {}).get("kind") in ("generated-sheet-frame", "generated-clean-background", "generated-material-mask-derivative")}
    record("generated-source-provenance-coverage", generated_paths <= set(source_records), {"missing": sorted(generated_paths - set(source_records))})
    for source_path in generated_paths:
        source = ROOT / source_path
        expected_hash = source_records.get(source_path, {}).get("sha256")
        record("generated-source:" + Path(source_path).name, source.is_file() and expected_hash == sha(source))
    sprite_prompts = {item["id"]: item for item in json.loads((HERE / "sprite-prompts.json").read_text(encoding="utf-8"))}
    generation_records_ok = True
    generation_record_details = {}
    for source_id, prompt in sprite_prompts.items():
        source_path = f"assets/levels/09-dark-moon-observatory/sources/v3/{source_id}.png"
        source_record = source_records.get(source_path, {})
        generation = source_record.get("generation_record") or {}
        source = ROOT / source_path
        with Image.open(source) as source_image:
            dimensions = list(source_image.size)
        valid = (
            generation.get("status") in ("PASS", "generated_source")
            and generation.get("recorded_sha256") == sha(source)
            and generation.get("output_size") == dimensions
            and generation.get("recorded_prompt_sha256") == hashlib.sha256(prompt["prompt"].encode("utf-8")).hexdigest()
        )
        alpha = generation.get("alpha_metadata")
        if alpha:
            total = dimensions[0] * dimensions[1]
            bbox = alpha.get("subject_bbox_alpha_ge_128", [])
            valid = valid and 0 <= alpha.get("alpha_min", -1) <= alpha.get("alpha_max", 256) <= 255 and sum(alpha.get(key, -1) for key in ("fully_transparent_pixels", "opaque_pixels", "partial_alpha_pixels")) == total and len(bbox) == 4 and 0 <= bbox[0] <= bbox[2] <= dimensions[0] and 0 <= bbox[1] <= bbox[3] <= dimensions[1]
        generation_records_ok = generation_records_ok and valid
        generation_record_details[source_id] = {"status": generation.get("status"), "size": dimensions, "recorded_hash_matches": generation.get("recorded_sha256") == sha(source), "recorded_prompt_matches": generation.get("recorded_prompt_sha256") == hashlib.sha256(prompt["prompt"].encode("utf-8")).hexdigest()}
    record("sprite-generation-record-metadata", generation_records_ok, generation_record_details)
    loop_path = by_id.get("observatory-loop-path", {})
    loop_norm = loop_path.get("normalization", {})
    loop_mask = ROOT / loop_norm.get("mask_source_v2", "missing")
    loop_image = images.get("observatory-loop-path")
    loop_mask_matches = loop_mask.is_file() and loop_image is not None and ImageChops.difference(loop_image.getchannel("A"), Image.open(loop_mask).convert("RGBA").getchannel("A")).getbbox() is None
    record("observatory-loop-path-generated-floor-material-preserves-v2-mask", loop_norm.get("kind") == "generated-material-mask-derivative" and loop_mask_matches and loop_norm.get("mask_source_v2_sha256") == sha(loop_mask), {"kind": loop_norm.get("kind"), "mask_source": loop_norm.get("mask_source_v2"), "mask_sha256": loop_norm.get("mask_source_v2_sha256")})
    reuse_sources = {asset["source"] for asset in manifest.get("assets", []) if asset.get("normalization", {}).get("kind") == "explicit-v2-source-reuse"}
    record("explicit-v2-reuse-hashes", all((ROOT / p).is_file() and sha(ROOT / p) == next(a["source_sha256"] for a in manifest["assets"] if a["source"] == p) for p in reuse_sources), {"source_count": len(reuse_sources)})

    for room, background_id in (("entrance", "lobby-base"), ("corridor", "star-chart-base"), ("observatory", "observatory-clean-base")):
        image = images.get(background_id)
        if image:
            hud_ok = True
            for x, y, width, height in contract["hud_bands"]:
                color = image.getpixel((x, y))
                if color != (11, 20, 32, 255) or image.crop((x, y, x + width, y + height)).getcolors(width * height) != [(width * height, color)]:
                    hud_ok = False
            record("background-hud-flat:" + room, hud_ok)
            walkable = Image.new("L", tuple(contract["canvas"]), 0)
            draw = ImageDraw.Draw(walkable)

            def fill_mask(rect: dict, value: int) -> None:
                draw.rectangle((rect["x"], rect["y"], rect["x"] + rect["width"] - 1, rect["y"] + rect["height"] - 1), fill=value)

            fill_mask(contract["floors"][room], 255)
            for alcove in contract["alcoves"]:
                if alcove["roomId"] == room:
                    fill_mask(alcove["threshold"], 255)
            if room == "observatory":
                fill_mask(contract["final_door_head"], 255)
            for wall in contract["walls"][room]:
                fill_mask(wall, 0)
            for alcove in contract["alcoves"]:
                if alcove["roomId"] == room:
                    for jamb in alcove["jambs"]:
                        fill_mask(jamb, 0)
            mask_file = {"entrance": "entrance-floor-mask.png", "corridor": "corridor-floor-mask.png", "observatory": "observatory-floor-mask.png"}[room]
            mask_path = HERE.parent / "v2" / mask_file
            actual_mask = Image.open(mask_path).convert("L").point(lambda p: 255 if p else 0)
            exact = walkable.size == actual_mask.size and ImageChops.difference(walkable, actual_mask).getbbox() is None
            record("floor-mask-contract:" + room, exact and sha(mask_path) == by_id[background_id]["normalization"].get("floor_mask_sha256"), {"path": str(mask_path), "sha256": sha(mask_path)})
            allowed = walkable.copy()
            allow_draw = ImageDraw.Draw(allowed)
            for wall in contract["walls"][room]:
                allow_draw.rectangle((wall["x"], wall["y"], wall["x"] + wall["width"] - 1, wall["y"] + wall["height"] - 1), fill=255)
            for alcove in contract["alcoves"]:
                if alcove["roomId"] == room:
                    for jamb in alcove["jambs"]:
                        allow_draw.rectangle((jamb["x"], jamb["y"], jamb["x"] + jamb["width"] - 1, jamb["y"] + jamb["height"] - 1), fill=255)
            pixels, mask_pixels = image.load(), allowed.load()
            unexpected = sum(1 for y in range(image.height) for x in range(image.width) if not mask_pixels[x, y] and pixels[x, y] != (11, 20, 32, 255))
            record("background-geometry-mask:" + room, unexpected == 0, {"pixels_outside_layout_geometry_with_art": unexpected})
            source_path = ROOT / by_id[background_id]["source"]
            with Image.open(source_path) as source_image:
                source_image.load()
                expected_background = reconstruct_background(source_image.convert("RGBA"), room, contract, normalization_map["background_samples"])
            diff = ImageChops.difference(image, expected_background).convert("RGB").getbbox()
            record("background-floor-and-masonry-source-zones:" + room, diff is None, {"pixel_diff_bbox": diff, "source": by_id[background_id]["source"]})
        else:
            record("background-hud-flat:" + room, False, "background asset missing")

    for asset_id, top in (("lumo-tube-dark", 2), ("lumo-tube-remembered", 2), ("lumo-seal-covered", 10), ("lumo-seal-revealed", 10)):
        image = images.get(asset_id)
        box = image.getchannel("A").getbbox() if image else None
        record("hud-clearance:" + asset_id, box is not None and box[1] >= top, box)
    bbox_thresholds = {name: sheet.get("alpha_bbox_threshold") for name, sheet in manifest.get("source_sheets", {}).items()}
    record("all-sheet-bounds-use-alpha-128-with-source-alpha-preserved", len(bbox_thresholds) == 18 and set(bbox_thresholds.values()) == {128} and all(sheet.get("source_alpha_preserved_within_crop") for sheet in manifest["source_sheets"].values()), bbox_thresholds)
    record("statue-halo-alpha-trim", bbox_thresholds.get("statue-family") == 128 and all(by_id.get(f"statue-{i}", {}).get("normalization", {}).get("source_id") == "statue-family" for i in range(4)), {"source_alpha_bbox_threshold": bbox_thresholds.get("statue-family")})
    for asset_id in ("return-loop-observatory-closed", "return-loop-observatory-open"):
        image = images.get(asset_id)
        box = image.getchannel("A").getbbox() if image else None
        content = by_id.get(asset_id, {}).get("normalization", {}).get("content_rect")
        record("return-loop-observatory-content:" + asset_id, box is not None and box[1] >= 6 and box[3] <= 42 and by_id[asset_id]["size"] == [48, 48] and content == [0, 6, 48, 36], {"alpha_bbox": box, "canvas": by_id.get(asset_id, {}).get("size"), "content_rect": content})

    root_states = [images.get("root-bed-" + name) for name in ("dark", "lit", "bridge", "retracted-dark")]
    root_mapping_ok = all(
        by_id.get("root-bed-" + name, {}).get("normalization", {}).get("root_mapping")
        and by_id.get("root-bed-" + name, {}).get("normalization", {}).get("lane_relative_y") == [50, 98]
        and [band["target_rect"] for band in by_id["root-bed-" + name]["normalization"].get("band_mapping", [])] == [[0, 0, 44, 50], [0, 50, 44, 48], [0, 98, 44, 50]]
        for name in ("dark", "lit", "bridge", "retracted-dark")
    )
    record("root-bands-land-on-frozen-geometry", root_mapping_ok)
    lane = (0, 50, 44, 98)
    if all(root_states):
        lane_crops = [im.crop(lane) for im in root_states]
        visible = [crop.getchannel("A").getbbox() for crop in lane_crops]
        bridge_distinct = ImageChops.difference(lane_crops[0].convert("RGB"), lane_crops[2].convert("RGB")).getbbox() is not None and ImageChops.difference(lane_crops[3].convert("RGB"), lane_crops[2].convert("RGB")).getbbox() is not None
        record("root-lane-state-changes", bridge_distinct, {"lane_relative_rect": [0, 50, 44, 48], "alpha_bounds": visible})
        warm = lambda im: sum(1 for r, g, b, a in im.getdata() if a and r > g + 12)
        emissive = lambda im: sum(1 for r, g, b, a in im.getdata() if a and r > 70 and r > g + 40)
        record("root-lit-amber-localized", warm(root_states[1]) > warm(root_states[0]) * 2, {"warm_pixels": warm(root_states[1]), "dark_baseline": warm(root_states[0])})
        record("root-retracted-dark", emissive(root_states[3]) <= emissive(root_states[0]), {"non_emissive_warm_material_pixels": warm(root_states[3]), "emissive_pixels": emissive(root_states[3]), "dark_emissive_baseline": emissive(root_states[0])})
    else:
        record("root-lane-state-changes", False, "root state missing")

    expected_states = {"02-shadowed-bed-grown-bridge": (True, True, 2, "bridge"), "03-lumo-recalled-dark-retracted-roots": (False, False, 2, "retracted-dark")}
    state_map = {state["id"]: state for state in review.get("states", [])}
    for state_id, expected in expected_states.items():
        state = state_map.get(state_id)
        actual = None if state is None else (state["power"], state["lumo"], state["statue"], state["root"])
        record("state-contract:" + state_id, actual == expected, {"expected": expected, "actual": actual})

    for state_id in ("02-shadowed-bed-grown-bridge", "03-lumo-recalled-dark-retracted-roots"):
        state = state_map.get(state_id)
        placement = next((p for p in review.get("placements", []) if p.get("review") == state_id and p.get("room") == "observatory" and p.get("module_id") == "final-door"), None)
        record("state-final-door-powered-open:" + state_id, state is not None and bool(state["sun"] or state["final"]) and placement is not None and placement.get("asset") == "final-door-open", {"state": state_id, "asset": None if placement is None else placement.get("asset")})

    for base in ("corridor-pipe-run", "observatory-pipe-run", "pipe-drop"):
        on_asset, off_asset = by_id[base + "-on"], by_id[base + "-off"]
        on_meta, off_meta = on_asset["normalization"].get("pipe_tiling", {}), off_asset["normalization"].get("pipe_tiling", {})
        orientation = "vertical" if base == "pipe-drop" else "horizontal"
        axis = 1 if orientation == "vertical" else 0
        on_box = images[on_asset["id"]].getchannel("A").getbbox()
        off_box = images[off_asset["id"]].getchannel("A").getbbox()
        on_span = on_box[3] - on_box[1] if axis else on_box[2] - on_box[0]
        off_span = off_box[3] - off_box[1] if axis else off_box[2] - off_box[0]
        blue = lambda im: sum(1 for r, g, b, a in im.getdata() if a > 127 and b > r + 25 and b > g + 8)
        valid = on_meta.get("source_frame") == (2 if orientation == "vertical" else 0) and off_meta.get("source_frame") == (3 if orientation == "vertical" else 1) and on_meta.get("orientation") == orientation and off_meta.get("orientation") == orientation and on_meta.get("visible_axis_span", 0) >= on_meta.get("target_axis_length", 1) * .8 and off_meta.get("visible_axis_span", 0) >= off_meta.get("target_axis_length", 1) * .8 and on_span >= on_asset["size"][axis] * .8 and off_span >= off_asset["size"][axis] * .8 and blue(images[on_asset["id"]]) > blue(images[off_asset["id"]]) * 1.5
        record("pipe-source-frame-span-and-state:" + base, valid, {"orientation": orientation, "on": on_meta, "off": off_meta, "blue_signal": {"on": blue(images[on_asset["id"]]), "off": blue(images[off_asset["id"]])}})

    elements = {element["id"]: element for element in contract["elements"]}
    alcoves = {item["id"]: item for item in contract["alcoves"]}
    for index, placement in enumerate(review.get("placements", [])):
        module = placement["module_id"]
        expected_rect = None
        if module in elements:
            rect = elements[module]["drawn_rect"]
            expected_rect = [int(rect["x"] + 0.5), int(rect["y"] + 0.5), rect["width"], rect["height"]]
        elif module.startswith("arch:"):
            rect = alcoves[module[5:]]["arch"]
            expected_rect = [rect["x"], rect["y"], rect["width"], rect["height"]]
        elif module.startswith("threshold:"):
            rect = alcoves[module[10:]]["threshold"]
            expected_rect = [rect["x"], rect["y"], rect["width"], rect["height"]]
        elif module.startswith("stamp:"):
            rect = next(x for x in contract["stamps"][placement["room"]] if x["id"] == module[6:])
            expected_rect = [rect["x"], rect["y"], rect["width"], rect["height"]]
        elif module == "scenery-wheel":
            expected_rect = [186, 59, 144, 88]
        if expected_rect is not None:
            record("placement:" + str(index), placement["rect"] == expected_rect, {"module": module, "expected": expected_rect, "actual": placement["rect"]})

    for item in review.get("reviews", []):
        path = ROOT / item["path"]
        try:
            with Image.open(path) as image:
                image.load()
                image = image.convert("RGBA")
            ok = list(image.size) == item["size"] and sha(path) == item["sha256"]
            if item.get("kind") in ("room", "three-room"):
                for band in ((0, 0, image.width, 58), (0, 320, image.width, 360)):
                    crop = image.crop(band)
                    colors = crop.getcolors(crop.width * crop.height)
                    ok = ok and colors == [(crop.width * crop.height, (11, 20, 32, 255))]
            record("review:" + path.name, ok)
        except Exception as exc:
            record("review:" + item.get("path", "unknown"), False, f"{type(exc).__name__}: {exc}")
    record("review-pngs-are-manifested", {p.name for p in (PACKAGE / "previews" / "v3").glob("*.png")} == {Path(x["path"]).name for x in review.get("reviews", [])})

    # Negative controls exercise the claims made by the independent raster and provenance checks.
    wrong = raster_errors(Image.new("RGBA", (1, 1), (10, 20, 30, 255)), (2, 2), True)
    opaque = raster_errors(Image.new("RGBA", (2, 2), (10, 20, 30, 255)), (2, 2), True)
    empty = raster_errors(Image.new("RGBA", (2, 2), (0, 0, 0, 0)), (2, 2), True)
    opaque_bg = raster_errors(Image.new("RGBA", (2, 2), (10, 20, 30, 0)), (2, 2), False)
    record("negative-control:wrong-size", "wrong-size" in wrong, wrong)
    record("negative-control:opaque-sprite", "opaque-sprite" in opaque, opaque)
    record("negative-control:empty-sprite", "empty" in empty, empty)
    record("negative-control:transparent-background", "nonopaque-background" in opaque_bg, opaque_bg)
    record("negative-control:tampered-hash", not digest_matches(b"asset", hashlib.sha256(b"expected").hexdigest()), "mismatching digest rejected")

    asset_fingerprint = hashlib.sha256(json.dumps([(a["id"], a["sha256"]) for a in manifest["assets"]], separators=(",", ":")).encode("utf-8")).hexdigest()
    failures = [check for check in CHECKS if check["result"] == "FAIL"]
    result = "FAIL" if failures else "PASS"
    report = {"result": result, "revision": {"manifest_sha256": sha(MANIFEST_PATH), "review_manifest_sha256": sha(REVIEW_PATH), "normalization_map_sha256": sha(HERE / "normalization-map.json"), "normalizer_sha256": sha(HERE / "normalize-assets.py"), "validator_sha256": sha(Path(__file__)), "asset_fingerprint_sha256": asset_fingerprint}, "counts": {"assets": len(manifest["assets"]), "reviews": len(review.get("reviews", [])), "checks": len(CHECKS)}, "checks": CHECKS, "visual_review": "PENDING; machine validation does not assert visual quality", "engine": "NOT_RUN", "collision": "NOT_RUN", "browser_play": "NOT_RUN"}
    report_path = PACKAGE / "validation-v3.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"result": result, "checks": len(CHECKS), "failures": failures, "assets": len(manifest["assets"]), "asset_fingerprint_sha256": asset_fingerprint}))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
