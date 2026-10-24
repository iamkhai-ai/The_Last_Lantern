/** Every illustration file under assets/levels/<level>/illustrations, keyed by its texture key (see illustrationKey). */
const illustrationModules = import.meta.glob('../../../assets/levels/*/illustrations/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** The texture key of an illustration file: `ill_` plus its file name without the extension. */
export function illustrationKey(path: string): string {
  return `ill_${path.slice(path.lastIndexOf('/') + 1, -4)}`;
}

/** Texture key to served URL for every illustration in the build. */
export const ILLUSTRATION_FILES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(illustrationModules).map(([path, url]) => [illustrationKey(path), url])),
);
