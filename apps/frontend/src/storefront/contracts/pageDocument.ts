export interface StorefrontPageDocument {
  id?: string;
  pageSlug?: string;
  builderJson?: string | Record<string, unknown> | null;
  sections?: unknown[];
  settings?: Record<string, unknown>;
}
