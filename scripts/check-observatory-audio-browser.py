"""Render real Web Audio into memory and inspect Level 09. No audio files are written.

Run with Vite listening on 127.0.0.1:5209:
  python scripts/check-observatory-audio-browser.py [--measure-only]
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--measure-only', action='store_true')
parser.add_argument('--report', type=Path, help='Optional JSON evidence path; creates no audio files')
args = parser.parse_args()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:5209')
    page.wait_for_load_state('networkidle')
    report = page.evaluate('''async () => {
      const effects = await import('/src/audio/effects.ts');
      const results = [];
      const random = Math.random;
      Math.random = () => 0.5;
      try {
        const entries = Object.entries(effects.EFFECT_CATALOG).map(([name, e]) => ({name, ...e}));
        for (const surface of ['stone', 'root']) for (const running of [false, true]) {
          entries.push({name: `${surface}-${running ? 'run' : 'walk'}`, durationSeconds: 0.3, targetPeakDbfs: -24,
            recipe: (ctx, out, t) => effects.footstep(ctx, out, t, {surface, running, foot: 0})});
        }
        for (const entry of entries) {
          const sampleRate = 48000;
          const ctx = new OfflineAudioContext(1, Math.ceil((entry.durationSeconds + 0.2) * sampleRate), sampleRate);
          entry.recipe(ctx, ctx.destination, 0.02);
          const buffer = await ctx.startRendering();
          const data = buffer.getChannelData(0);
          let peak = 0, energy = 0, last = 0;
          for (let i = 0; i < data.length; i++) {
            peak = Math.max(peak, Math.abs(data[i])); energy += data[i] * data[i];
            if (Math.abs(data[i]) > 0.00001) last = i / sampleRate;
          }
          results.push({name: entry.name, peakDbfs: +(20 * Math.log10(peak)).toFixed(2),
            rmsDbfs: +(10 * Math.log10(energy / data.length)).toFixed(2), lastSampleSeconds: +last.toFixed(3),
            durationSeconds: entry.durationSeconds, targetPeakDbfs: entry.targetPeakDbfs});
        }
      } finally { Math.random = random; }
      return {measurements: results};
    }''')
    report['pageErrors'] = errors
    if not args.measure_only:
        for item in report['measurements']:
            assert abs(item['peakDbfs'] - item['targetPeakDbfs']) <= 4, item
            assert item['lastSampleSeconds'] <= item['durationSeconds'] + 0.04, item
        report['runtime'] = page.evaluate('''async () => {
          const {SoundSystem: Sound} = await import('/src/systems/SoundSystem.ts');
          const {CampaignSaveSystem: Save} = await import('/src/systems/CampaignSaveSystem.ts');
          const {OBSERVATORY_ROOMS: rooms} = await import('/src/data/observatoryRooms.ts');
          const calls = [];
          for (const name of ['playObservatoryCue', 'playDoorOpen', 'playDoorClose', 'playLightPulse',
            'playMechanismLatch', 'playPuzzleError', 'playCrystalPickup', 'playUiItemGet', 'playDawnChord', 'setMusicLevel']) {
            const original = Sound[name].bind(Sound);
            Sound[name] = (...args) => { calls.push([name, ...args]); return original(...args); };
          }
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          let checkpoints = 0;
          const assert = (condition, message) => { if (!condition) throw Error(message); checkpoints++; };
          const count = (name, arg) => calls.filter(call => call[0] === name && (arg === undefined || call[1] === arg)).length;
          const progress = Save.createDefaultProgress();
          Object.assign(progress, {level: 8, furthest: 8, roomId: 'entrance', lanternPickedUp: true, lanternOn: true});
          Object.assign(progress.flags, {'intro-8': true, 'intro-8-corridor': true});
          Save.save(progress);
          const game = window.__LAST_LANTERN_GAME__;
          game.scene.start('CampaignScene', {});
          await wait(350);
          const s = game.scene.getScene('CampaignScene');
          assert(s.progress.level === 8, 'the seeded Level 09 scene starts');
          const move = (x, y) => { s.player.setPosition(x, y); s.player.sprite.body.updateFromGameObject(); };
          const dismiss = () => {
            while (s.dialogue.isActive()) {
              s.dialogue.visibleChars = s.dialogue.fullLineText.length;
              s.dialogue.lastInputTime = 0;
              s.dialogue.handleAdvanceInput(performance.now());
            }
          };
          const use = id => {
            s.dialogue.stop();
            const target = s.interactions.interactables.find(item => item.id === `observatory-${id}`);
            assert(target, `control ${id} is registered`);
            target.onInteract();
          };
          const refresh = () => { s.refreshObservatoryDoors(); s.refreshObservatoryPuzzle(); };
          assert(count('playObservatoryCue') === 0 && count('playDoorOpen') === 0, 'restoring a scene is silent');
          use('lantern-pedestal'); refresh();
          assert(count('playDoorOpen') === 1, 'the first beam opens Door A once');
          s.buildObservatoryRoom('corridor');
          use('door-a-control'); use('door-a-control');
          assert(count('playMechanismLatch') === 1, 'Door A latch sounds only once');
          s.dialogue.stop();
          s.callObservatoryLumo('seal');
          for (let i = 0; i < 1000 && s.getObservatoryLumoSteps().length; i++) s.updateObservatoryLumo(50);
          refresh();
          assert(s.getObservatoryState().lumoAtSeal, 'the real Lumo route reaches the seal');
          assert(count('playObservatoryCue', 'observatoryRain') === 1, 'first seal arrival plays short rain');
          assert(count('playObservatoryCue', 'tubeOn') === 1, 'the supply sounds when Lumo really arrives');
          Object.assign(s.progress.counters, {'l8-g0': 1, 'l8-g1': 2, 'l8-g2': 1, 'l8-statue': 2});
          refresh();
          assert(count('playObservatoryCue', 'rootBridgeGrow') === 1, 'the bridge grows once');
          assert(count('playLightPulse') === 1, 'the splitter receives its cue');
          const stateCount = calls.length;
          for (let i = 0; i < 20; i++) refresh();
          s.buildObservatoryRoom('observatory');
          assert(calls.length === stateCount, 'repeated refresh and changing rooms replay no cues');
          move(362, 205);
          s.dialogue.stop(); s.update(0, 16);
          assert(Sound.footstepSurface === 'root', 'a deployed bridge uses root footsteps');
          s.callObservatoryLumo('recall'); refresh();
          assert(count('playObservatoryCue', 'lumoLeave') === 1, 'leaving the seal uses the descending cue');
          assert(count('playObservatoryCue', 'tubeOff') === 1, 'supply stops immediately');
          assert(count('playObservatoryCue', 'rootBridgeRetract') === 0, 'the bridge safety hold stays audible as deployed');
          move(420, 205); s.update(0, 16); refresh();
          assert(count('playObservatoryCue', 'rootBridgeRetract') === 1, 'retraction sounds after Nhinh steps off');
          assert(Sound.footstepSurface === 'stone', 'the bank returns to stone footsteps');
          assert(count('playDoorClose') === 0, 'latched doors remain silent and open');
          s.progress.flags['l8-bridge-crossed'] = true;
          use('final-door-control'); use('stone-return-loop'); use('stone-return-loop');
          assert(count('playMechanismLatch') === 2, 'the final latch has a mechanical cue');
          assert(count('playObservatoryCue', 'stoneRing') === 1, 'the return loop locks into place once');
          s.buildObservatoryRoom('entrance'); use('lantern-pedestal');
          assert(count('playUiItemGet') === 1, 'retrieving the lamp uses item pickup');
          Object.assign(s.progress.flags, {'l8-lumo-route-json': '', 'l8-lumo-destination': 'lantern-source',
            'l8-lumo-arrived': 'lantern-source', 'l8-lumo-room': 'observatory', 'l8-lumo-recalled': true});
          s.buildObservatoryRoom('observatory');
          const record = rooms.observatory.interactables.find(item => item.id === 'final-record');
          move(record.interactionPoint.x, record.interactionPoint.y);
          s.lumo.sprite.setPosition(s.player.x - 20, s.player.y - 22);
          use('final-record');
          assert(s.observatoryMemoryPlaying, 'reunited actors can start the actual recording');
          dismiss();
          await wait(5400);
          const memoryCues = calls.filter(call => call[0] === 'playObservatoryCue' && call[1].startsWith('memory')).map(call => call[1]);
          assert(JSON.stringify(memoryCues) === JSON.stringify(['memoryImpact', 'memoryWaterFade', 'memoryCracks', 'memoryFlash']), 'the four causal sounds run in order');
          dismiss(); await wait(2400); dismiss();
          assert(s.observatoryMemoryPlaying, 'the final answer starts a real rest');
          assert(calls.at(-1)[0] === 'setMusicLevel' && calls.at(-1)[1] === 0, 'music is fully silenced');
          const on = s.lantern.lanternOn;
          s.input.keyboard.emit('keydown-F'); s.input.keyboard.emit('keydown-E'); s.input.keyboard.emit('keydown-J');
          assert(s.lantern.lanternOn === on && !s.dialogue.isActive(), 'F/E/J do not interrupt the silent beat');
          await wait(1500);
          assert(s.observatoryMemoryPlaying, 'the rest lasts beyond 1.5 seconds');
          await wait(1950);
          assert(!s.observatoryMemoryPlaying, 'the rest finishes after 3.2 seconds');
          assert(calls.at(-1)[0] === 'setMusicLevel' && calls.at(-1)[1] === 1, 'music returns after the rest');
          use('balance-crystal'); use('balance-crystal');
          assert(count('playCrystalPickup') === 1, 'the actual crystal pickup sounds once');
          use('final-door-control');
          assert(count('playDawnChord') === 1, 'departure has its dawn chord');
          game.scene.stop('CampaignScene');
          assert(Sound.memoryWeatherStop === null, 'shutdown releases memory weather');
          return {status: 'PASS', checkpoints, stateAndStoryCalls: calls};
        }''')
        assert not errors, errors
    root = Path(__file__).resolve().parent.parent
    report['codeRevision'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    report['sourceSha256'] = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in [
        'src/audio/effects.ts', 'src/audio/ambience.ts', 'src/audio/music.ts', 'src/audio/synth.ts',
        'src/systems/SoundSystem.ts', 'src/systems/ObservatoryAudio.ts', 'src/scenes/CampaignScene.ts',
    ]}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    browser.close()
