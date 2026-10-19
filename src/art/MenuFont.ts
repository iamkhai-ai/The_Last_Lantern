import bitterUrl from '../assets/fonts/bitter/Bitter-Variable.ttf?url';

let fontReady: Promise<FontFace> | undefined;

/** Load before Phaser measures menu text; the face stays registered across scene restarts. */
export function loadMenuFont(): Promise<FontFace> {
  if (!fontReady) {
    const face = new FontFace('Bitter', `url("${bitterUrl}")`, { weight: '500', style: 'normal' });
    fontReady = face.load().then(loaded => {
      document.fonts.add(loaded);
      return loaded;
    });
  }
  return fontReady;
}
