#!/usr/bin/env python3
"""Validate Level 06 v2 raster exports against the fixed asset contract."""
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"assets/levels/06-the-sleepless-tower/redesign-v2"
MANIFEST=ART/"production-manifest.json"
EXPECTED={
 "tower-scene-base.png":(640,360),
 "G0-to-splitter.png":(40,48),"G0-to-A.png":(40,48),"G0-to-B.png":(40,48),
 "prism-dark.png":(48,48),"prism-receiving.png":(48,48),
 **{f"ring-{a}-{s}.png":(24,24) for a in "ABC" for s in ("off","on")},
 "tower-lamp-white.png":(72,72),"tower-lamp-dim.png":(72,72),
 "fountain-up.png":(56,112),"fountain-down.png":(56,112),
 "return-flow-waiting.png":(40,48),"return-flow-held.png":(40,48),
 "chamber-open.png":(80,104),"chamber-grille-overlay.png":(80,104),
 "record-compartment-closed.png":(88,32),"record-compartment-open.png":(88,32),
 "window-faded-red-scarf.png":(112,112),"tower-intake.png":(112,32),"tower-outflow.png":(112,32),
 "voice-record-panel.png":(160,72),
}

def digest(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()
def fail(msg:str)->None: print(f"FAIL: {msg}")

def main()->int:
    errors=[]
    if not MANIFEST.is_file():
        print(f"FAIL: missing {MANIFEST.relative_to(ROOT)}"); return 1
    doc=json.loads(MANIFEST.read_text(encoding="utf-8"))
    entries={Path(a["file"]).name:a for a in doc.get("assets",[])}
    missing=set(EXPECTED)-set(entries)
    extra=set(entries)-set(EXPECTED)
    if missing: errors.append("manifest missing contract assets: "+", ".join(sorted(missing)))
    if extra: errors.append("unexpected manifest assets: "+", ".join(sorted(extra)))
    images={}
    for name,size in EXPECTED.items():
        path=ART/"sprites"/name
        if not path.is_file(): errors.append(f"missing export {name}"); continue
        try: im=Image.open(path); im.load()
        except Exception as e: errors.append(f"cannot decode {name}: {e}"); continue
        images[name]=im
        entry=entries.get(name)
        if im.size!=size: errors.append(f"{name} canvas {im.size}, expected {size}")
        if name!="tower-scene-base.png" and im.mode!="RGBA": errors.append(f"{name} mode {im.mode}, expected RGBA")
        if name!="tower-scene-base.png":
            alpha=im.getchannel("A")
            if alpha.getbbox() is None: errors.append(f"{name} is fully transparent")
            if alpha.getextrema()==(255,255): errors.append(f"{name} has no transparent pixels")
            b=alpha.point(lambda a:255 if a>=20 else 0).getbbox()
            if b is None: errors.append(f"{name} has no visible pixels at alpha >=20")
            elif b[0]==0 or b[1]==0 or b[2]==im.width or b[3]==im.height:
                touched=set()
                if b[0]==0: touched.add("left")
                if b[1]==0: touched.add("top")
                if b[2]==im.width: touched.add("right")
                if b[3]==im.height: touched.add("bottom")
                allowed=set(entry.get("edge_touch_allowed", []))
                unexpected=touched-allowed
                if unexpected:
                    errors.append(f"{name} visible content touches unexpected canvas edges {sorted(unexpected)} ({b})")
        if entry:
            if entry.get("canvas")!=list(size): errors.append(f"manifest canvas mismatch for {name}")
            if entry.get("export_sha256")!=digest(path): errors.append(f"export hash mismatch for {name}")
            src=ART/entry.get("source","")
            if not src.is_file(): errors.append(f"source missing for {name}: {entry.get('source')}")
            elif entry.get("source_sha256")!=digest(src): errors.append(f"source hash mismatch for {name}")
            if name.startswith("G0-") and entry.get("optical_ports",{}).get("beam_center")!=[20,21]: errors.append(f"G0 port contract mismatch for {name}")
            if name.startswith("prism-") and entry.get("optical_ports")!={"input":[24,30],"left_output":[7,30],"right_output":[39,30]}: errors.append(f"prism port contract mismatch for {name}")
    # State pairs must share a stable pivot/registration: content centers and baselines stay aligned.
    pairs=[("tower-lamp-white.png","tower-lamp-dim.png"),("fountain-up.png","fountain-down.png"),
           ("return-flow-waiting.png","return-flow-held.png"),("record-compartment-closed.png","record-compartment-open.png"),
           ("tower-intake.png","tower-outflow.png")]
    for a,b in pairs:
        if a not in images or b not in images: continue
        bounds=[]
        for name in (a,b):
            bb=images[name].getchannel("A").point(lambda x:255 if x>=20 else 0).getbbox()
            bounds.append(bb)
        if any(abs(bounds[0][i]-bounds[1][i])>4 for i in range(4)):
            errors.append(f"paired registration differs by >4px: {a} {bounds[0]} vs {b} {bounds[1]}")
    # Checksums on the committed 1x/2x evidence sheets make sure the generator produced both.
    for rel in ("previews/asset-contact-1x.png","previews/asset-contact-2x.png","previews/scene-base-1280x720.png"):
        p=ART/rel
        try:
            im=Image.open(p); im.load()
            if im.width==0 or im.height==0: errors.append(f"empty preview {rel}")
        except Exception as e: errors.append(f"missing/invalid preview {rel}: {e}")
    if errors:
        for e in errors: fail(e)
        print(f"Raster check: FAIL ({len(errors)} issues)"); return 1
    print(f"Raster check: PASS ({len(EXPECTED)} contract canvases, hashes, alpha, ports, paired registrations, previews)")
    return 0

if __name__=="__main__": sys.exit(main())
