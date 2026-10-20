/*
 * In-browser audit of "stand flush against an object, does E show?" for the interactables of the CURRENT level.
 *
 * Not a Node check (it needs the live Phaser game). Paste the whole file into the page via the browser tool's
 * javascript runner, then call:
 *
 *   await __reachAudit.start(levelIndex, flags, lanternOn)   // boots CampaignScene at that level (0-based)
 *   __reachAudit.report()                                     // prints one line per interactable
 *
 * Metrics per interactable (it is forced enabled with a non-empty prompt, so game state does not hide it):
 *   extraGap   worst number of pixels the feet must be AWAY from the object's south face before E appears,
 *              beyond the first walkable pixel (0 = E shows as soon as the feet touch). 99 = never shows there.
 *   noPrompt   south-face sample columns where E never shows although the spot is walkable.
 *   northHits  north-face flush positions where E DOES show. RULE_GAMES.md rule 1 says this must be 0
 *              (the level-2 rune stones are the documented four-sided exception).
 *   sideHits   informational: east/west flush positions where E shows.
 * Samples are the foot body (read from the player's real Arcade body) against the physics static bodies.
 */
(() => {
  const game = () => window.__LAST_LANTERN_GAME__;
  const scene = () => game().scene.getScene('CampaignScene');

  async function start(level, flags = {}, lantern = true) {
    const g = game();
    for (let i = 0; i < 60 && !g.scene.getScenes(true).some((s) => s.scene.key === 'MenuScene'); i++) {
      await new Promise((r) => setTimeout(r, 500)); // the boot scene must finish first
    }
    localStorage.setItem('last-lantern-campaign-save-v1', JSON.stringify({
      version: 1, level, flags, counters: {}, lanternOn: lantern, lanternPickedUp: lantern,
    }));
    g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key));
    g.scene.start('CampaignScene');
    await new Promise((r) => setTimeout(r, 2500));
    const sc = scene();
    for (let i = 0; i < 20; i++) { try { sc.dialogue.advance && sc.dialogue.advance(); } catch (e) { /* no dialogue */ } }
    return sc.progress.level;
  }

  function measure() {
    const sc = scene();
    const I = sc.interactions;
    const sp = sc.player.sprite;
    const b = sp.body;
    const x0 = sp.x, y0 = sp.y;
    const fx = b.x - x0, fy = b.y - y0, fw = b.width, fh = b.height;
    const walk = (x, y) => {
      const rx = x + fx, ry = y + fy;
      if (rx < 0 || ry < 0 || rx + fw > 640 || ry + fh > 360) return false;
      return sc.physics.overlapRect(rx, ry, fw, fh, false, true).length === 0;
    };
    // Mirrors CampaignScene's call: the foot body at this sprite position is passed as the last argument,
    // so `reach`-opted controls are measured from the feet, exactly as at runtime.
    const footAt = (x, y) => ({ x: x + fx, y: y + fy, width: fw, height: fh });
    const prompts = (x, y, id) => { I.update(x, y, true, undefined, [], footAt(x, y)); const t = I.getActiveTarget(); return !!t && t.id === id; };

    const items = I.interactables;
    const saved = items.map((i) => [i.isEnabled, i.getPrompt]);
    items.forEach((i) => { i.isEnabled = () => true; i.getPrompt = () => 'x'; });
    const out = [];
    try {
      for (const it of items) {
        const pb = it.getPromptBounds && it.getPromptBounds();
        if (!pb) { out.push({ id: it.id, skipped: 'no-prompt-bounds' }); continue; }
        // "South face" = the object's collision south edge when it opts in with `reach` (RULE_GAMES §1: the
        // foot body is measured against the collision rect), else the prompt-bounds bottom as before.
        const bottom = it.reach ? it.reach.rect.y + it.reach.rect.height : pb.y + pb.height, top = pb.y;
        const south = [];
        for (let x = Math.ceil(pb.x + 4); x <= pb.x + pb.width - 4; x += 6) {
          let firstWalk = null, firstPrompt = null;
          for (let gap = 0; gap <= 44; gap++) {
            const y = bottom + gap - fy;
            if (!walk(x, y)) continue;
            if (firstWalk === null) firstWalk = gap;
            if (prompts(x, y, it.id)) { firstPrompt = gap; break; }
          }
          south.push([x, firstWalk, firstPrompt]);
        }
        const reachable = south.filter((r) => r[1] !== null);
        const extra = reachable.map((r) => (r[2] === null ? 99 : r[2] - r[1]));
        let northHits = 0, northSamples = 0;
        for (let x = Math.ceil(pb.x + 4); x <= pb.x + pb.width - 4; x += 6) {
          const y = top - fh - fy - 1; // feet just above the object's top edge
          if (!walk(x, y)) continue;
          northSamples++;
          if (prompts(x, y, it.id)) northHits++;
        }
        let sideHits = 0;
        for (const sx of [pb.x - fw - fx - 1, pb.x + pb.width - fx + 1]) {
          for (let y = Math.ceil(pb.y + 4); y <= bottom - 4; y += 6) {
            if (walk(sx, y - fy) && prompts(sx, y - fy, it.id)) sideHits++;
          }
        }
        out.push({
          id: it.id,
          bounds: [Math.round(pb.x), Math.round(pb.y), Math.round(pb.width), Math.round(pb.height)],
          southSamples: reachable.length,
          extraGap: extra.length ? Math.max(...extra) : null,
          noPrompt: reachable.filter((r) => r[2] === null).length,
          northSamples, northHits, sideHits,
        });
      }
    } finally {
      items.forEach((i, k) => { i.isEnabled = saved[k][0]; i.getPrompt = saved[k][1]; });
      sp.setPosition(x0, y0);
      I.update(x0, y0, true, undefined, [], footAt(x0, y0));
    }
    return out;
  }

  function report() {
    return measure().map((r) => (r.skipped
      ? `${r.id} SKIP ${r.skipped}`
      : `${r.id} extraGap=${r.extraGap} noPrompt=${r.noPrompt}/${r.southSamples} northHits=${r.northHits}/${r.northSamples} sideHits=${r.sideHits} bounds=${r.bounds}`));
  }

  window.__reachAudit = { start, measure, report };
})();
