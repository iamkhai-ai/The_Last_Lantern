/**
 * Build-time release flavor for the bounded demo slice (levels 01–04).
 *
 * The campaign is always authored as ten levels. `VITE_BUILD_FLAVOR=demo`
 * exposes only indices 0–3 to the player, ends the run at the Shattered Creek
 * exit, and refuses to resume saves outside that slice. An absent or empty
 * value means `full`: the unchanged ten-level campaign.
 *
 * The flavor is build-time only. It is never inferred from the URL, a save, or
 * development mode, and an invalid value is rejected instead of silently
 * falling back to the full campaign.
 *
 * This is a gameplay/build boundary, not a security boundary: it does not prune
 * unused level code or assets from the single-file artifact, and it is not a
 * defense against devtools tampering.
 */

export type BuildFlavor = 'full' | 'demo';

export const FULL_LEVEL_COUNT = 10;
export const DEMO_LEVEL_COUNT = 4;

export interface ReleasePolicy {
  readonly flavor: BuildFlavor;
  readonly isDemo: boolean;
  /** Highest campaign index (0-based) this build lets the player reach. */
  readonly lastPlayableLevelIndex: number;
  /** Top-right menu pill, e.g. `PLAYTEST · MÀN 01–10`. */
  readonly menuTag: string;
  /** Bottom-right build tag, e.g. `PLAYTEST BUILD · MÀN 01–10`. */
  readonly buildTag: string;
  /**
   * A saved campaign outside this build's slice must not be resumed, and must
   * not be cleared, rewritten or clamped. Full mode never blocks a save.
   */
  isOutOfRange(level: number, completed: boolean): boolean;
}

const TAGS: Record<BuildFlavor, { menuTag: string; buildTag: string }> = {
  full: {
    menuTag: 'PLAYTEST · MÀN 01–10',
    buildTag: 'PLAYTEST BUILD · MÀN 01–10',
  },
  demo: {
    menuTag: 'DEMO · MÀN 01–04',
    buildTag: 'DEMO BUILD · MÀN 01–04',
  },
};

/**
 * Resolves the optional build flavor. `undefined`, `null` and the empty string
 * are the default full build; only the exact strings `full` and `demo` are
 * accepted. Any other nonempty value throws, so a typo cannot quietly expose
 * the full campaign in a demo build.
 */
export function resolveBuildFlavor(raw: unknown): BuildFlavor {
  if (raw === undefined || raw === null || raw === '') return 'full';
  if (raw === 'full' || raw === 'demo') return raw;
  throw new Error(
    `Invalid VITE_BUILD_FLAVOR value ${JSON.stringify(raw)}. `
    + 'Expected "full" or "demo" (or leave it unset for full). '
    + 'Refusing to fall back to the full campaign silently.',
  );
}

export function createReleasePolicy(flavor: BuildFlavor): ReleasePolicy {
  const lastPlayableLevelIndex = flavor === 'demo' ? DEMO_LEVEL_COUNT - 1 : FULL_LEVEL_COUNT - 1;
  return Object.freeze({
    flavor,
    isDemo: flavor === 'demo',
    lastPlayableLevelIndex,
    ...TAGS[flavor],
    isOutOfRange(level: number, completed: boolean): boolean {
      if (flavor !== 'demo') return false;
      return completed || level > lastPlayableLevelIndex;
    },
  });
}

function readBuildFlavor(): string | undefined {
  // The Node-based checks import this module without Vite's import.meta.env.
  if (typeof import.meta.env === 'undefined') return undefined;
  return import.meta.env.VITE_BUILD_FLAVOR;
}

export const RELEASE_POLICY: ReleasePolicy = createReleasePolicy(resolveBuildFlavor(readBuildFlavor()));
