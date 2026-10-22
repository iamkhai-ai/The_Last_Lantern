"""Capture real WebGL scenes from isolated seeded saves; this is not a full playthrough."""
from pathlib import Path
import argparse
import json
import hashlib
from playwright.sync_api import sync_playwright

B = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5188/')
parser.add_argument('--out', default='runtime-v2')
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
out = B / 'previews' / args.out
out.mkdir(parents=True, exist_ok=True)
evidence_path = out / 'capture-results.json'
# A failed or interrupted capture must not leave the previous run looking current.
evidence_path.write_text(json.dumps({'status': 'IN_PROGRESS', 'captures': []}), encoding='utf-8')
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

initial_hashes = {p.name: sha(p) for p in sorted((B/'sprites').glob('*.png'))}
initial_provenance = sha(B/'provenance.json')
provenance = json.loads((B/'provenance.json').read_text(encoding='utf-8'))
for entry in provenance['requirements'] + provenance['sources']:
    assert sha(B.parents[2]/entry['file']) == entry['sha256'], f"Regenerate provenance: {entry['file']}"
crystals = {f'l9-{b}': True for b in ('memory', 'hope', 'balance')}
solved = {'heart-g0': 0, 'heart-memory': 1, 'heart-balance': 2, 'heart-statue': 2}
cases = [
    ('01-empty', {}, {}, True),
    ('02-inserted', crystals, {}, True),
    ('03-lumo-holding', {**crystals, 'l9-lantern-placed': True, 'l9-called-heart': True},
     {'lumo-x': 320, 'lumo-y': 244, 'heart-g0': 1}, True),
    ('04-ready', {**crystals, 'l9-lantern-placed': True, 'l9-called-heart': True},
     {**solved, 'lumo-x': 320, 'lumo-y': 244}, True),
    ('05-latched', {**crystals, 'l9-roots': True, 'l9-lantern-placed': True}, solved, True),
    ('06-overload', {**crystals, 'l9-roots': True, 'l9-lantern-retrieved': True,
                     'l9-overload': True}, solved, True),
    ('08-dawn', {**crystals, 'l9-roots': True, 'l9-complete': True,
                 'l9-lantern-retrieved': True, 'l9-ending-beat': 'tree-return'}, solved, False),
    ('09-seated', {**crystals, 'l9-roots': True, 'l9-complete': True,
                   'l9-lantern-retrieved': True, 'l9-ending-beat': 'seated'}, solved, False),
    ('10-title', {**crystals, 'l9-roots': True, 'l9-complete': True,
                  'l9-lantern-retrieved': True, 'l9-ending-beat': 'trail-title'}, solved, False),
    ('11-variants-west', {**crystals, 'l9-lantern-placed': True},
     {'heart-g0': 0, 'heart-memory': 2, 'heart-balance': 3, 'heart-statue': 1}, True),
    ('12-variants-north', {**crystals, 'l9-lantern-placed': True},
     {'heart-g0': 0, 'heart-memory': 3, 'heart-balance': 0, 'heart-statue': 3}, True),
]
AUDIT = """(key) => {
  const g=window.__LAST_LANTERN_GAME__, s=g.scene.getScene(key), h=s.heartLevel;
  const info=im=>({key:im.texture.key, size:[im.displayWidth,im.displayHeight],
    native:[im.texture.getSourceImage().width,im.texture.getSourceImage().height],
    position:[im.x,im.y], origin:[im.originX,im.originY], alpha:im.alpha, visible:im.visible});
  return {renderer:g.renderer.type, canvas:[g.canvas.width,g.canvas.height], scene:key,
    stage:h?.stage?.(),state:h?.state?.(),lumoMode:h?.lumoMode,bloom:h?.overlays?.get('bloom')?.visible,
    lantern:h ? {on:h.lantern.lanternOn,inHand:h.lantern.lanternInHand,placed:h.lantern.lanternPlaced} : null,
    textures:h ? Object.fromEntries([...h.images].map(([id,im])=>[id,info(im)])) : {},
    visibleImages:s.children.list.filter(o=>o.texture&&o.visible&&o.alpha>0).map(info),
    beat:s.sequence?.getBeat?.()};
}"""

def audit_scene(page, key):
    audit = page.evaluate(AUDIT, key)
    assert audit['renderer'] == 2 and audit['canvas'] == [640, 360], audit
    for image in audit['textures'].values():
        assert image['size'] == image['native'], image
        assert image['key'].startswith('art_10_the_heart_of_elaria_'), image
    return audit

results = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for name, flags, counters, on in (cases[:1] if args.baseline else cases):
        context = browser.new_context(viewport={'width': 640, 'height': 360}, device_scale_factor=1)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        save = {'version': 1, 'level': 9, 'furthestLevel': 9,
                'flags': {'intro-9': True, 'l9-rules-read': True, **flags},
                'counters': {'player-level': 9, 'player-x': 277, 'player-y': 280, **counters},
                'lanternPickedUp': True, 'lanternOn': on}
        page.add_init_script('localStorage.setItem("last-lantern-campaign-save-v1", ' + json.dumps(json.dumps(save)) + ');')
        page.goto(args.url, wait_until='networkidle')
        page.wait_for_function("window.__LAST_LANTERN_GAME__?.scene.isActive('MenuScene')", timeout=60000)
        page.evaluate("""() => {
          const g=window.__LAST_LANTERN_GAME__;
          g.scene.stop('MenuScene'); g.scene.start('CampaignScene');
        }""")
        scene_key = 'EndingScene' if flags.get('l9-complete') else 'CampaignScene'
        page.wait_for_function('(k)=>window.__LAST_LANTERN_GAME__.scene.isActive(k)', arg=scene_key)
        page.wait_for_timeout(800 if name != '10-title' else 4800)
        if scene_key == 'CampaignScene':
            # Finish automatically triggered stability dialogue through real, released E presses.
            # The seeded player position is outside any control gate, so this cannot activate a control.
            for _ in range(16):
                active = page.evaluate("window.__LAST_LANTERN_GAME__.scene.getScene('CampaignScene').dialogue.isActive()")
                if not active:
                    break
                page.keyboard.press('e')
                page.wait_for_timeout(190)
            page.wait_for_timeout(120)
        page.locator('canvas').screenshot(path=str(out / f'{name}.png'))
        audit = audit_scene(page, scene_key)
        if name == '03-lumo-holding':
            assert audit['state']['hope'] and audit['lumoMode'] == 'holding'
        if name == '04-ready':
            assert audit['state']['ready'] and not audit['state']['latched']
        if name == '05-latched':
            assert audit['state']['latched'] and not audit['bloom']
        if name == '06-overload':
            assert audit['bloom'] and audit['lantern']['on'] and audit['lantern']['inHand']
        if scene_key == 'EndingScene':
            assert audit['beat'] == flags['l9-ending-beat'], audit
            visible = {im['key'] for im in audit['visibleImages']}
            assert 'art_10_the_heart_of_elaria_sanctuary_base' in visible
            if name == '09-seated':
                assert 'art_10_the_heart_of_elaria_ending_nhinh_seated_unlit_leaf' in visible
            if name == '10-title':
                assert 'art_10_the_heart_of_elaria_ending_title_the_last_dawn' in visible
        results.append({'name': name, 'seed': save, 'audit': audit, 'errors': errors,
                        'file': f'previews/{args.out}/{name}.png'})
        if name == '06-overload':
            page.keyboard.press('f')
            page.wait_for_function("window.__LAST_LANTERN_GAME__.scene.isActive('EndingScene')")
            page.wait_for_timeout(200)
            page.locator('canvas').screenshot(path=str(out / '07-after-F-night.png'))
            night = audit_scene(page, 'EndingScene')
            assert night['beat'] == 'night-call', night
            results.append({'name': '07-after-F-night', 'trigger': 'real F key from restored overload',
                            'audit': night, 'file': f'previews/{args.out}/07-after-F-night.png', 'errors': list(errors)})
        context.close()
    browser.close()
hashes = {p.name: sha(p) for p in sorted((B/'sprites').glob('*.png'))}
assert hashes == initial_hashes and sha(B/'provenance.json') == initial_provenance, 'Inputs changed during capture; rerun.'
for result in results:
    result['sha256'] = sha(B/result['file'])
error_count = sum(len(r['errors']) for r in results)
evidence_path.write_text(json.dumps({'status': 'FAIL' if error_count else 'PASS', 'captures': results,
    'sprite_hashes': hashes, 'provenance_sha256': initial_provenance},
    indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'captures': len(results), 'out': str(out), 'errors': sum(len(r['errors']) for r in results)}))
if error_count:
    raise SystemExit(1)
