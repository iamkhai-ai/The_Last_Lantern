/**
 * Level selection from the pause menu: pure rules, no Phaser import, usable from a Node check script.
 *
 * The player may go back to any level already reached, and keeps the puzzles solved there. "Reached" is the furthest
 * level ever played (`furthest`), capped at the build's last playable level so a demo never offers level 05 or later,
 * even when the save came from the full campaign.
 */
import type { CampaignProgress } from './CampaignSaveSystem';

export type LevelSelectProgress = { level: number; furthest?: number };

/** The highest level index the player may select: the furthest reached, capped at `lastPlayable`, never below 0. */
export function reachedLevel(progress: LevelSelectProgress, lastPlayable: number): number {
  const furthest = Math.max(progress.level, progress.furthest ?? progress.level);
  return Math.max(0, Math.min(furthest, lastPlayable));
}

/** A selectable target: an integer in [0, reached], and not the level the player is already on. */
export function canSelectLevel(target: number, progress: LevelSelectProgress, lastPlayable: number): boolean {
  return Number.isInteger(target)
    && target >= 0
    && target <= reachedLevel(progress, lastPlayable)
    && target !== progress.level;
}

/**
 * Moves the campaign to an earlier (or already reached) level. The flags and counters are untouched, so every puzzle
 * stays solved. The room the player was in is cleared so the target level starts at its default. The lantern is held,
 * because the level's start assumes it was picked up. Returns false and changes nothing when the target is refused.
 */
export function applyLevelSelection(progress: CampaignProgress, target: number, lastPlayable: number): boolean {
  if (!canSelectLevel(target, progress, lastPlayable)) return false;
  const reached = reachedLevel(progress, lastPlayable);
  progress.furthest = Math.max(progress.furthest ?? 0, progress.level, reached);
  progress.level = target;
  delete progress.roomId;
  delete progress.roomSpawn;
  progress.lanternPickedUp = true;
  return true;
}
