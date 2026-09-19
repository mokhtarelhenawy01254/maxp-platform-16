// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  LANDING_STYLE_PRESETS,
  ensureLandingStyleFontLoaded,
  resolveLandingStyle,
  shadeHexColor,
} from '../utils/landingStyles';

describe('landingStyles presets', () => {
  it('ships 6 presets with unique ids, labels and complete variable sets', () => {
    expect(LANDING_STYLE_PRESETS).toHaveLength(6);

    const ids = LANDING_STYLE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(6);

    for (const preset of LANDING_STYLE_PRESETS) {
      expect(preset.label.trim().length).toBeGreaterThan(0);
      expect(preset.swatch).toHaveLength(3);
      for (const key of [
        '--pil-page',
        '--pil-ink',
        '--pil-surface',
        '--pil-teal',
        '--pil-teal-deep',
      ]) {
        expect(preset.vars[key]).toMatch(/^#|^"/);
      }
    }
  });

  it('falls back to the classic preset for null/unknown style', () => {
    const fromNull = resolveLandingStyle(null);
    const fromUnknown = resolveLandingStyle({ preset: 'does-not-exist' });
    const classic = LANDING_STYLE_PRESETS[0];

    expect(fromNull.preset.id).toBe('classic');
    expect(fromUnknown.preset.id).toBe('classic');
    expect(fromNull.cssVars['--pil-page']).toBe(classic.vars['--pil-page']);
    expect(fromUnknown.cssVars['--pil-teal']).toBe(classic.vars['--pil-teal']);
  });

  it('brand color overrides the CTA colors and derives a deeper shade', () => {
    const resolved = resolveLandingStyle({ brandColor: '#b4552d' });

    expect(resolved.cssVars['--pil-teal']).toBe('#b4552d');
    expect(resolved.cssVars['--pil-teal-deep']).toBe(shadeHexColor('#b4552d', -0.16));
    expect(resolved.cssVars['--pil-teal-deep']).not.toBe('#b4552d');
  });

  it('ignores invalid brand colors and clamps the button radius', () => {
    const resolved = resolveLandingStyle({
      brandColor: 'not-a-color',
      buttonRadius: 999,
    });

    expect(resolved.cssVars['--pil-teal']).toBe(
      LANDING_STYLE_PRESETS[0].vars['--pil-teal'],
    );
    expect(resolved.cssVars['--pil-radius']).toBe('28px');

    const negative = resolveLandingStyle({ buttonRadius: -5 });
    expect(negative.cssVars['--pil-radius']).toBe('0px');
  });

  it('maps heading fonts to their stacks and keeps the body font intact', () => {
    const cairo = resolveLandingStyle({ headingFont: 'cairo' });
    expect(cairo.fontKey).toBe('cairo');
    expect(cairo.cssVars['--pil-display']).toContain('"Cairo"');
    expect(cairo.cssVars['--pil-body']).toContain('"Almarai"');

    const invalid = resolveLandingStyle({ headingFont: 'comic-sans' });
    expect(invalid.fontKey).toBe('almarai');
  });

  it('shadeHexColor darkens and lightens within hex bounds', () => {
    expect(shadeHexColor('#ffffff', -0.16)).toBe('#d6d6d6');
    expect(shadeHexColor('#000000', 0.5)).toBe('#808080');
    expect(shadeHexColor('#808080', -1)).toBe('#000000');
    expect(shadeHexColor('#808080', 2)).toBe('#ffffff');
  });
});

describe('ensureLandingStyleFontLoaded', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('injects the stylesheet once for non-default fonts and never for almarai', () => {
    ensureLandingStyleFontLoaded('almarai');
    expect(document.head.querySelectorAll('link[data-landing-font]')).toHaveLength(0);

    ensureLandingStyleFontLoaded('cairo');
    ensureLandingStyleFontLoaded('cairo');
    expect(document.head.querySelectorAll('link[data-landing-font="cairo"]')).toHaveLength(1);

    ensureLandingStyleFontLoaded('tajawal');
    expect(document.head.querySelectorAll('link[data-landing-font]')).toHaveLength(2);
  });
});
