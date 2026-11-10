import { describe, expect, it } from "vitest";
import theme from "../themes/marketplace-avenue-ar.json";
import { localizePageConfig } from "../i18n/storefrontLocale";
import { localizeThemeShell } from "../i18n/shellLocale";
import type { StorefrontTheme } from "../types/theme.types";

const bilingual = theme as unknown as StorefrontTheme;
const homeAr = bilingual.pages.home;

describe("marketplace-avenue-ar bilingual theme", () => {
  it("serves the Arabic copy by default", () => {
    const page = localizePageConfig(homeAr, "ar");
    const hero = page.sections[0] as { settings?: Record<string, unknown> };
    expect(String(hero.settings?.title)).toMatch(/[\u0600-\u06FF]/);
  });

  it("swaps section copy to English while keeping the base images and links", () => {
    const arHero = homeAr.sections[0] as { settings?: Record<string, any> };
    const page = localizePageConfig(homeAr, "en");
    const hero = page.sections[0] as { settings?: Record<string, any> };

    expect(String(hero.settings?.title)).not.toMatch(/[\u0600-\u06FF]/);
    expect(hero.settings?.title).not.toBe(arHero.settings?.title);
    // the English override only carries strings - the cover image must still come from the base
    expect(hero.settings?.image).toBe(arHero.settings?.image);
    expect(hero.settings?.ctaLink).toBe(arHero.settings?.ctaLink);
  });

  it("localizes every section that carries an English override", () => {
    const translated = homeAr.sections.filter(
      (section) => (section as { settings?: { i18n?: unknown } }).settings?.i18n,
    );
    expect(translated.length).toBeGreaterThanOrEqual(7);

    const page = localizePageConfig(homeAr, "en");
    const leadingArabic = page.sections
      .map((section) => String((section as { settings?: Record<string, any> }).settings?.title || ""))
      .filter((title) => /[\u0600-\u06FF]/.test(title));
    expect(leadingArabic).toHaveLength(0);
  });

  it("translates header navigation and keeps the Arabic link targets", () => {
    const ar = localizeThemeShell(bilingual, "ar");
    const en = localizeThemeShell(bilingual, "en");

    expect(ar.header?.navigation[0].label).toBe("الرئيسية");
    expect(en.header?.navigation[0].label).toBe("Home");
    expect(en.header?.navigation[0].to).toBe(ar.header?.navigation[0].to);
    expect(en.header?.dropdowns?.[0]?.items?.[0]?.to).toBe(
      ar.header?.dropdowns?.[0]?.items?.[0]?.to,
    );
    expect(en.header?.dropdowns?.[0]?.items?.[0]?.label).not.toMatch(/[\u0600-\u06FF]/);
  });

  it("translates the footer columns and copyright", () => {
    const en = localizeThemeShell(bilingual, "en");
    expect(String(en.footer?.copyrightText)).not.toMatch(/[\u0600-\u06FF]/);
    expect(en.footer?.navigation[0]?.links?.[0]?.label).not.toMatch(/[\u0600-\u06FF]/);
  });

  it("is a no-op for a theme that declares no English overrides", () => {
    const { header, footer } = bilingual;
    const plain = {
      ...bilingual,
      header: { variant: header?.variant, navigation: [{ label: "متجر", to: "/shop" }] },
      footer: { ...footer, i18n: undefined },
    } as unknown as StorefrontTheme;
    expect(localizeThemeShell(plain, "en")).toBe(plain);
  });
});
