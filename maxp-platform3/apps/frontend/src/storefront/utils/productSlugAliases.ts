export interface ProductSlugAliasContext {
  companyId?: string | null;
  companySlug?: string | null;
  hostname?: string | null;
}

const SWAN_COMPANY_ID = "cmleybpf70028juo2wwpmp8rt";
const SWAN_COMPANY_SLUG = "swan";
const SWAN_HOSTNAMES = new Set(["swan.maxp.online", "www.swan.maxp.online"]);

const SWAN_LEGACY_PRODUCT_SLUG_ALIASES: Record<string, string> = {
  "kotshy-soan": "swan-sneaker-1775145033",
};

const normalizeSlugKey = (value: string | null | undefined): string =>
  String(value || "")
    .trim()
    .toLowerCase();

const isSwanStorefrontContext = ({
  companyId,
  companySlug,
  hostname,
}: ProductSlugAliasContext): boolean => {
  const normalizedCompanyId = normalizeSlugKey(companyId);
  const normalizedCompanySlug = normalizeSlugKey(companySlug);
  const normalizedHostname = normalizeSlugKey(hostname);

  return (
    normalizedCompanyId === SWAN_COMPANY_ID ||
    normalizedCompanySlug === SWAN_COMPANY_SLUG ||
    SWAN_HOSTNAMES.has(normalizedHostname)
  );
};

export const resolveLegacyProductSlugAlias = (
  productSlugOrId: string | null | undefined,
  context: ProductSlugAliasContext = {},
): string | null => {
  if (!isSwanStorefrontContext(context)) {
    return null;
  }

  const normalizedSlug = normalizeSlugKey(productSlugOrId);
  const aliasTarget = SWAN_LEGACY_PRODUCT_SLUG_ALIASES[normalizedSlug];

  if (!aliasTarget || aliasTarget === normalizedSlug) {
    return null;
  }

  return aliasTarget;
};
