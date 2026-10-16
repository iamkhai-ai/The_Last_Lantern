import assert from 'node:assert/strict';
import { consumeCampaignNewGameIntent } from '../src/systems/CampaignStartIntent.ts';

const retainedSceneData = { newGame: true };
assert.equal(consumeCampaignNewGameIntent({ newGame: true }, retainedSceneData), true,
  'an explicit New Game start is honored');
assert.deepEqual(retainedSceneData, {}, 'consuming New Game clears Phaser retained scene data');
assert.equal(consumeCampaignNewGameIntent(undefined, retainedSceneData), false,
  'normal restart and Continue do not replay the consumed New Game request');

assert.equal(consumeCampaignNewGameIntent({ newGame: true }, retainedSceneData), true,
  'a later explicit New Game request still resets the campaign');
assert.equal(consumeCampaignNewGameIntent({ newGame: true }, retainedSceneData), true,
  'explicit pause Restart still resets the campaign');
assert.equal(consumeCampaignNewGameIntent(undefined, retainedSceneData), false,
  'after either explicit reset, later normal transitions load saved progress');

console.log('Campaign start intent lifecycle checks passed.');
