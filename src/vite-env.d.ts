/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional build-time campaign slice: unset or `full` for the ten-level
   * campaign, `demo` for levels 01–04. Read through src/config/releaseConfig.ts.
   */
  readonly VITE_BUILD_FLAVOR?: string;
}
