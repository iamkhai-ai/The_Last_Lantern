#!/usr/bin/env python3
"""Export the retained Level 06 art generations into fixed local runtime canvases."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets/levels/06-the-sleepless-tower/redesign-v2"
SRC = ART / "sources"
OUT = ART / "sprites"
MANIFEST = ART / "production-manifest.json"

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def bbox_alpha(im: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = im.getchannel("A")
    # Ignore one-pixel alpha specks/shadows that are below the intended visible contour.
    mask = alpha.point(lambda a: 255 if a >= 20 else 0)
    return mask.getbbox()

def sheet_asset(name: str, source: str, box: tuple[int,int,int,int], size: tuple[int,int], *,
                anchor: tuple[float,float] = (.5,1), port: dict | None = None,
                contain: float = .96, threshold: int = 20) -> dict:
    src = SRC / source
    image = Image.open(src).convert("RGBA").crop(box)
    # Preserve the alpha on original sources; threshold only determines the crop.
    alpha = image.getchannel("A").point(lambda a: 255 if a >= threshold else 0)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"No visible pixels in crop for {name}: {source} {box}")
    image = image.crop(bounds)
    cw, ch = size
    scale = min(cw * contain / image.width, ch * contain / image.height)
    nw, nh = max(1, round(image.width * scale)), max(1, round(image.height * scale))
    image = image.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", size, (0,0,0,0))
    px = round(cw*anchor[0] - nw/2)
    py = round(ch*anchor[1] - nh)
    # Wall/floor pieces may use a centered anchor (0.5, 0.5).
    if anchor[1] != 1:
        py = round(ch*anchor[1] - nh/2)
    px = max(0, min(cw-nw, px)); py = max(0, min(ch-nh, py))
    canvas.alpha_composite(image, (px,py))
    dst = OUT / name
    canvas.save(dst, optimize=True)
    return {"file": f"sprites/{name}", "canvas": list(size), "anchor_normalized": list(anchor),
            "optical_ports": port or {}, "source": f"sources/{source}", "source_sha256": sha(src),
            "source_crop_xyxy": list(box), "visible_crop_xyxy": list(bounds),
            "transform": {"fit": "nearest proportional contain", "scale": round(scale,6),
                          "threshold_for_bounds": threshold, "alpha_preserved": True},
            "export_sha256": sha(dst)}

def single(name: str, source: str, size: tuple[int,int], **kwargs) -> dict:
    im=Image.open(SRC/source)
    return sheet_asset(name, source, (0,0,*im.size), size, **kwargs)

def grid(name: str, source: str, row: int, col: int, rows: int, cols: int,
         size: tuple[int,int], **kwargs) -> dict:
    im=Image.open(SRC/source); w,h=im.size
    x0=round(col*w/cols); x1=round((col+1)*w/cols)
    y0=round(row*h/rows); y1=round((row+1)*h/rows)
    return sheet_asset(name, source, (x0,y0,x1,y1), size, **kwargs)

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    records=[]
    # Background source is an approved clean scene generation; fit the entire 16:9 scene.
    bgsrc=SRC/"tower-scene-base-original.png"
    bg=Image.open(bgsrc).convert("RGB").resize((640,360), Image.Resampling.LANCZOS)
    bg.save(OUT/"tower-scene-base.png", optimize=True)
    records.append({"file":"sprites/tower-scene-base.png","canvas":[640,360],"anchor":"full-frame",
      "optical_ports":{},"source":"sources/tower-scene-base-original.png","source_sha256":sha(bgsrc),
      "source_crop_xyxy":[0,0,*Image.open(bgsrc).size],"transform":{"fit":"Lanczos full-frame resize","alpha_preserved":False},
      "export_sha256":sha(OUT/"tower-scene-base.png")})
    port_g0={"beam_center":[20,21]}
    for col,name in enumerate(["G0-to-splitter.png","G0-to-A.png","G0-to-B.png"]):
        records.append(grid(name,"G0-states-original.png",col,0,3,1,(40,48),anchor=(.5,.5),port=port_g0,contain=.92))
    port_prism={"input":[24,30],"left_output":[7,30],"right_output":[39,30]}
    for row,name in enumerate(["prism-dark.png","prism-receiving.png"]):
        records.append(grid(name,"prism-states-original.png",row,0,2,1,(48,48),anchor=(.5,.5),port=port_prism,contain=.98))
    for row,state in enumerate(["off","on"]):
        for col,letter in enumerate(["A","B","C"]):
            records.append(grid(f"ring-{letter}-{state}.png","rings-family-exact-original.png",row,col,2,3,(24,24),anchor=(.5,.5),contain=.96))
    for row,state in enumerate(["white","dim"]):
        records.append(grid(f"tower-lamp-{state}.png","tower-lamp-family-original.png",row,0,2,1,(72,72),anchor=(.5,.5),contain=.92))
    for row,state in enumerate(["up","down"]):
        records.append(grid(f"fountain-{state}.png","fountain-family-original.png",0,row,1,2,(56,112),anchor=(.5,.5),contain=.96))
    for row,state in enumerate(["waiting","held"]):
        records.append(grid(f"return-flow-{state}.png","return-flow-family-original.png",row,0,2,1,(40,48),anchor=(.5,.5),contain=.94))
    records.append(grid("chamber-open.png","chamber-family-original.png",0,0,1,2,(80,104),anchor=(.5,1),contain=.96))
    records.append(grid("chamber-grille-overlay.png","chamber-family-original.png",0,1,1,2,(80,104),anchor=(.5,1),contain=.96))
    # The closed/open drawer pair is the corrected reference edit, not its older prototype.
    records.append(grid("record-compartment-closed.png","record-compartment-family-reference-edit.png",0,0,1,2,(88,32),anchor=(.5,.5),contain=.98))
    records.append(grid("record-compartment-open.png","record-compartment-family-reference-edit.png",0,1,1,2,(88,32),anchor=(.5,.5),contain=.98))
    for row,state in enumerate(["up","down"]):
        records.append(grid(f"tower-{('intake' if row==0 else 'outflow')}.png","tower-flow-family-original.png",row,0,2,1,(112,32),anchor=(.5,.5),contain=.96))
    # Window and recording panel are already authored at their intended canvases.
    records.append(single("window-faded-red-scarf.png","window-faded-red-scarf-reuse.png",(112,112),anchor=(.5,.5),contain=1))
    records.append(single("voice-record-panel.png","voice-record-panel-reuse.png",(160,72),anchor=(.5,.5),contain=1))
    # These edge contacts are intentional framing/anchors confirmed against the 1x/2x sheets.
    edge_touch_allowed={
        "prism-receiving.png":["top","right","bottom"],
        **{f"ring-{a}-{s}.png":["left","top","right","bottom"] for a in "ABC" for s in ("off","on")},
        "chamber-open.png":["bottom"], "chamber-grille-overlay.png":["bottom"],
        "window-faded-red-scarf.png":["top","bottom"],
        "tower-intake.png":["top"], "tower-outflow.png":["top"],
        "voice-record-panel.png":["left","right"],
    }
    for record in records:
        record["edge_touch_allowed"]=edge_touch_allowed.get(Path(record["file"]).name, [])
    # Retain Hope as the original separate collectible; runtime worker uses the original path.
    # An empty visual waiting panel is not generated: functional UI remains code-native.
    doc={"schema_version":1,"scope":"Level 06 local production sprites and background only",
         "pixel_sampling":"nearest","exporter":"scripts/export-level06-art.py",
         "sources_preserved":True,"alpha_policy":"preserve source alpha; never harden translucency",
         "shared_family_palette":"source-generated; palette is not forcibly quantized to avoid destroying glass/glow",
         "assets":records,
         "notes":["Production source seed: sources/tower-scene-base-original.png, fitted to 640x360.",
          "G0 ports are authored at [20,21]; prism ports at [24,30], [7,30], [39,30].",
          "State family crops are deterministic proportional nearest-neighbor fits. Human visual inspection is still required.",
          "No text or functional labels are baked into assets."]}
    MANIFEST.write_text(json.dumps(doc,indent=2)+"\n",encoding="utf-8")
    # Contact sheets show real native pixels (1x) and nearest enlargement (2x).
    from PIL import ImageDraw, ImageFont
    preview = ART / "previews"; preview.mkdir(exist_ok=True)
    names=[r["file"].split("/",1)[1] for r in records if r["file"] != "sprites/tower-scene-base.png"]
    def sheet(scale: int) -> Image.Image:
        cell_w, cell_h = 176, 144
        cols=4; rows=(len(names)+cols-1)//cols
        out=Image.new("RGB",(cols*cell_w,rows*cell_h),(28,39,45)); draw=ImageDraw.Draw(out)
        for i,name in enumerate(names):
            im=Image.open(OUT/name).convert("RGBA")
            im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
            x=(i%cols)*cell_w; y=(i//cols)*cell_h
            bx=x+(cell_w-im.width)//2; by=y+22+(cell_h-22-im.height)//2
            checker=Image.new("RGBA",im.size,(67,78,80,255)); checker.alpha_composite(im)
            out.paste(checker.convert("RGB"),(bx,by))
            draw.text((x+4,y+4),name,fill=(235,222,185))
        return out
    sheet(1).save(preview/"asset-contact-1x.png",optimize=True)
    sheet(2).save(preview/"asset-contact-2x.png",optimize=True)
    bg.resize((1280,720),Image.Resampling.NEAREST).save(preview/"scene-base-1280x720.png",optimize=True)
    print(f"Exported {len(records)} assets to {OUT}")

if __name__ == "__main__": main()
