import assert from 'node:assert/strict';
import { layoutInteractionPrompt } from '../src/systems/interactionPromptLayout.ts';

const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;
const actor = (x, y) => ({ x: x - 18, y: y - 21, width: 36, height: 42 });
const checkClear = (name, target, player, width = 140, height = 24, protectedBounds = []) => {
  const prompt = layoutInteractionPrompt(target, player, width, height, undefined, protectedBounds);
  assert.ok(prompt.x >= 8 && prompt.x + prompt.width <= 632, `${name}: stays inside horizontal safe area`);
  assert.ok(prompt.y >= 82 && prompt.y + prompt.height <= 310, `${name}: avoids HUD bands`);
  assert.equal(intersects(prompt, player), false, `${name}: does not cover Nhinh`);
  assert.equal(intersects(prompt, target), false, `${name}: does not cover target artwork`);
  for (const [index, bounds] of protectedBounds.entries()) {
    assert.equal(intersects(prompt, bounds), false, `${name}: does not cover protected character ${index + 1}`);
  }
  return prompt;
};

const lantern = { x: 214, y: 210, width: 20, height: 28 };
for (const [x, y] of [[224, 251], [204, 251], [244, 251], [224, 231], [224, 271]]) {
  checkClear(`Lantern approach (${x},${y})`, lantern, actor(x, y));
}
checkClear('Lantern prompt avoids Lumo above the lamp', lantern, actor(224, 251), 140, 24, [actor(224, 203)]);

const tablet = { x: 276, y: 170, width: 48, height: 60 };
checkClear('Tablet south approach', tablet, actor(300, 238), 198, 24);

const gate = { x: 410, y: 10, width: 152, height: 156 };
for (const y of [128, 151, 174]) checkClear(`Gate approach y=${y}`, gate, actor(486, y), 172, 24);

checkClear('Near left viewport and upper HUD', { x: 0, y: 72, width: 22, height: 24 }, actor(16, 91), 150, 24);
checkClear('Near right viewport and lower HUD with long dynamic label', { x: 596, y: 278, width: 28, height: 28 }, actor(614, 300), 378, 52);
const observatoryRoots = { x: 330, y: 280, width: 132, height: 40 };
checkClear('Observatory root bed', observatoryRoots, actor(396, 288), 160, 24);
checkClear('Observatory root bridge after it becomes visible', observatoryRoots, actor(398, 326), 238, 24);

console.log('Interaction prompt placement checks passed.');
