import type { Copy } from './types';

/** Put a venue's words into the page. The page itself names no venue. */
export function applyCopy(c: Copy) {
  document.title = c.documentTitle;
  const text = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const html = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  };
  document.getElementById('cw-canvas')?.setAttribute('aria-label', c.canvasLabel);
  text('cw-name', c.name);
  text('cw-address', c.address);
  text('cw-kicker', c.kicker);
  text('cw-intro-name', c.name);
  text('cw-intro-text', c.intro);
  text('cw-start', c.start);
  text('cw-hint-keys', c.hintKeys);
  text('cw-hint-touch', c.hintTouch);
  html('cw-credit', c.credit);
  text('cw-about-heading', c.aboutHeading);
  html('cw-about-body', c.about.join(''));
  text('cw-loader-name', c.name);
  text('cw-loader-note', c.loaderNote);
  text('cw-info-title', c.infoTitle);
  text('cw-info-meta', c.infoMeta);
  html('cw-info-body', c.info.map((p) => `<p>${p}</p>`).join(''));
  html('cw-info-foot', c.infoFoot);
  text('cw-fallback-title', c.fallbackTitle);
  text('cw-fallback-text', c.fallbackText);
}
