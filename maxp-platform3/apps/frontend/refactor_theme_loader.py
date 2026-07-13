import re
import os

filepath = r"h:\max_p_new\frontend\src\config\themes\ThemeRuntimeLoader.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove eagerManifestModules
content = re.sub(
    r'const eagerManifestModules = import\.meta\.glob\("\./\*/theme-manifest\.json", \{\s*eager: true,\s*import: "default",\s*\}\) as Record<string, ThemeManifest>;',
    '',
    content,
    flags=re.MULTILINE
)

# 2. Add AVAILABLE_THEME_IDS
content = re.sub(
    r'const warnedUnsupportedValues = new Set<string>\(\);',
    r'''export const AVAILABLE_THEME_IDS = Object.keys(manifestModules).map((path) => {
  const segments = path.split("/");
  return segments[segments.length - 2] || "default";
});

const warnedUnsupportedValues = new Set<string>();''',
    content
)

# 3. Remove manifestRegistry and runtimeRegistry, and ThemeRuntimeConfig building
# Let's just rip out lines 185 to 264.
# We can use targeted replaces.
content = re.sub(r'const manifestRegistry: Record<string, ThemeManifest> = .*?\}, \{\}\);', '', content, flags=re.DOTALL)
content = re.sub(r'const runtimeRegistry: ThemeRuntimeRegistry = .*?\}, \{\}\);', '', content, flags=re.DOTALL)
content = re.sub(r'const buildRuntimeConfig = .*?;\s*};', '', content, flags=re.DOTALL)

# 4. Remove STOREFRONT_LAYOUT_FAMILIES & STOREFRONT_LAYOUT_FAMILY_KEYS exports
content = re.sub(r'export const STOREFRONT_LAYOUT_FAMILIES: Record.*?\}, \{\}\);', '', content, flags=re.DOTALL)
content = re.sub(r'export const STOREFRONT_LAYOUT_FAMILY_KEYS = Object.keys\(\s*STOREFRONT_LAYOUT_FAMILIES,\s*\);', '', content, flags=re.DOTALL)

# 5. Remove getAllRuntimeConfigs
content = re.sub(r'const getAllRuntimeConfigs = \(\): ThemeRuntimeConfig\[\] =>.*?localeCompare\(right\.label\),\s*\);', '', content, flags=re.DOTALL)
content = re.sub(r'export const getThemeRuntimeConfigs = \(\): ThemeRuntimeConfig\[\] =>\s*getAllRuntimeConfigs\(\);', '', content, flags=re.DOTALL)

# 6. Simplify resolveKnownRuntimeThemeId
new_resolve_known = '''const resolveKnownRuntimeThemeId = (
  raw: unknown,
  page?: StorefrontRuntimeLayoutPage,
): string => {
  const normalized = normalizeStorefrontLayoutValue(raw);
  if (!normalized) {
    return "";
  }

  // Check legacy aliases first
  const aliased = LEGACY_LAYOUT_FAMILY_ALIASES[normalized];
  const effective = aliased || normalized;

  if (aliased) {
    warnUnsupportedValue("layout family alias", normalized, [aliased]);
  }

  if (AVAILABLE_THEME_IDS.includes(effective)) {
    return effective;
  }

  return "";
};'''
content = re.sub(r'const resolveKnownRuntimeThemeId = \([\s\S]*?return resolveManifestAliasAcrossPages\(effective\);\s*};', new_resolve_known, content)

# 7. Update getThemeManifestSnapshot
content = re.sub(
    r'export const getThemeManifestSnapshot = \([\s\S]*?\|\| null;',
    r'''export const getThemeManifestSnapshot = (
  themeId: string,
): ThemeManifest | null => manifestCache[themeId] || null;''',
    content
)

# 8. Update hasStorefrontLayoutFamily
content = re.sub(
    r'export const hasStorefrontLayoutFamily = \(value: string\): boolean =>[\s\S]*?Boolean\(runtimeRegistry\[value\]\);',
    r'export const hasStorefrontLayoutFamily = (value: string): boolean => AVAILABLE_THEME_IDS.includes(value);',
    content
)

# 9. Override resolveStorefrontLayoutFamily
new_resolve = '''export const resolveStorefrontLayoutFamily = (
  raw: unknown,
  options?: {
    fallback?: string;
    scope?: string;
    warn?: boolean;
  },
): string => {
  const normalized = normalizeStorefrontLayoutValue(raw);
  const fallback = options?.fallback || "default";
  const resolvedThemeId = resolveKnownRuntimeThemeId(normalized);

  if (resolvedThemeId && AVAILABLE_THEME_IDS.includes(resolvedThemeId)) {
    return resolvedThemeId;
  }

  if (normalized && options?.warn !== false) {
    warnUnsupportedValue(
      options?.scope || "layout family",
      normalized,
      AVAILABLE_THEME_IDS,
    );
  }

  return AVAILABLE_THEME_IDS.includes(fallback) ? fallback : "default";
};'''
content = re.sub(r'export const resolveStorefrontLayoutFamily = \([\s\S]*?return runtimeRegistry\[fallback\] \? fallback : "default";\s*};', new_resolve, content)

# 10. Override resolveStorefrontLayoutFamilyForPage
new_resolve_page = '''export const resolveStorefrontLayoutFamilyForPage = (
  raw: unknown,
  page: StorefrontRuntimeLayoutPage,
  options?: {
    fallback?: string;
    scope?: string;
    warn?: boolean;
  },
): string => {
  return resolveStorefrontLayoutFamily(raw, options);
};'''
content = re.sub(r'export const resolveStorefrontLayoutFamilyForPage = \([\s\S]*?return resolveStorefrontLayoutFamily\(fallback, \{\s*fallback,\s*scope: options\?\.scope,\s*warn: false,\s*\}\);\s*};', new_resolve_page, content)

# 11. Simplify getThemeCssVariables
new_css = '''export const getThemeCssVariables = (themeId: string): GeneratedCssVariables => {
  const normalizedThemeId = resolveStorefrontLayoutFamily(themeId, {
    fallback: "default",
    warn: false,
  });
  const manifest = getThemeManifestSnapshot(normalizedThemeId) || getThemeManifestSnapshot("default");

  if (manifest) {
    return tokensToCssVariables(buildGeneratedTokensFromManifest(manifest));
  }

  return tokensToCssVariables(
    generateTokens({
      primary: FALLBACK_THEME_PRIMARY,
      secondary: FALLBACK_THEME_SECONDARY,
      mood: "minimal",
    }),
  );
};'''
content = re.sub(r'export const getThemeCssVariables = \([\s\S]*?\}\),\s*\);\s*};', new_css, content)

# 12. Delete findStorefrontLayoutFamily, getStorefrontLayoutFamily, isStorefrontLayoutFamilySupportedOnPage, findSupportedStorefrontLayoutFamily, getSupportedStorefrontLayoutFamiliesForPage, getSupportedStorefrontLayoutFamilyKeysForPage, hasStorefrontLayoutForPage, getThemeRuntimeExample, getThemeManifestRegistry, getThemeRuntimeRegistry
content = re.sub(r'export const findStorefrontLayoutFamily = \([\s\S]*?return runtimeConfig \? getFamilyDefinition\(runtimeConfig\) : null;\s*};', '', content)
content = re.sub(r'export const getStorefrontLayoutFamily = \([\s\S]*?return getFamilyDefinition\(runtimeConfig\);\s*};', '', content)
content = re.sub(r'export const isStorefrontLayoutFamilySupportedOnPage = \([\s\S]*?Boolean\(runtimeRegistry\[family\]\?\.supportedPages\[page\]\);', '', content)
content = re.sub(r'export const findSupportedStorefrontLayoutFamily = \([\s\S]*?return null;\s*};', '', content)
content = re.sub(r'export const getSupportedStorefrontLayoutFamiliesForPage = \([\s\S]*?getFamilyDefinition\(runtimeConfig\)\);', '', content)
content = re.sub(r'export const getSupportedStorefrontLayoutFamilyKeysForPage = \([\s\S]*?family\.id\);', '', content)
content = re.sub(r'export const hasStorefrontLayoutForPage = \([\s\S]*?runtimeConfig\?\.supportedPages\[page\],\s*\);\s*};', '', content)
content = re.sub(r'export const getThemeRuntimeExample = \([\s\S]*?\);\s*\);\s*};', '', content)
content = re.sub(r'export const getThemeManifestRegistry = \([\s\S]*?\};\s*\);', '', content)
content = re.sub(r'export const getThemeRuntimeRegistry = \([\s\S]*?\};\s*\);', '', content)

# 13. Fix buildGeneratedTokensFromManifest
content = re.sub(
    r'const defaultManifest = manifestRegistry\["default"\];',
    r'const defaultManifest = manifestCache["default"];',
    content
)

# 14. Fix clearThemeRuntimeCaches
content = re.sub(r'Object\.entries\(manifestRegistry\)\.forEach\(\(\[themeId, manifest\]\) => \{\s*manifestCache\[themeId\] = manifest;\s*\}\);', '', content)


with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Refactor script executed successfully.")
