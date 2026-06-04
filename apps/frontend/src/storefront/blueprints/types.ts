import type {
  StorefrontFooterConfig,
  StorefrontHeaderConfig,
  StorefrontPageLayout,
  StorefrontPageConfig,
  StorefrontSEOConfig,
  StorefrontTheme,
  StorefrontThemeColors,
  StorefrontThemeShape,
  StorefrontThemeTypography,
  StorefrontThemeProductCardTokens,
} from "../types/theme.types";
import type { StorefrontContentOverrides } from "../utils/contentOverrides";
import type { StorefrontPageKey, StorefrontPageOverrides } from "../utils/pageOverrides";

export interface StorefrontBlueprintPageConfig extends StorefrontPageConfig {
  layoutHint?: StorefrontPageLayout;
}

export interface StorefrontBlueprintThemeTokens {
  colors?: Partial<StorefrontThemeColors>;
  typography?: Partial<StorefrontThemeTypography>;
  shape?: Partial<StorefrontThemeShape>;
  productCard?: Partial<StorefrontThemeProductCardTokens>;
}

export interface StorefrontBlueprintSource {
  kind: "manual" | "stitch" | "import";
  project?: string;
  descriptor?: string;
  promptPath?: string;
  designPath?: string;
}

export interface StorefrontTemplateBlueprint {
  id: string;
  name: string;
  description?: string;
  baseThemeId?: string;
  tokens?: StorefrontBlueprintThemeTokens;
  header?: Partial<StorefrontHeaderConfig>;
  footer?: Partial<StorefrontFooterConfig>;
  seo?: Partial<StorefrontSEOConfig>;
  pages?: Partial<Record<StorefrontPageKey, StorefrontBlueprintPageConfig>>;
  pageOverrides?: StorefrontPageOverrides;
  contentOverrides?: StorefrontContentOverrides;
  source?: StorefrontBlueprintSource;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CompiledStorefrontBlueprint {
  blueprint: StorefrontTemplateBlueprint;
  theme: StorefrontTheme;
  designTokens: Record<string, unknown>;
  pageOverrides: StorefrontPageOverrides;
  contentOverrides: StorefrontContentOverrides;
  layoutHints: Partial<Record<StorefrontPageKey, StorefrontPageLayout>>;
}
