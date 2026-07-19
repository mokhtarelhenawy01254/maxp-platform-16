type ResolveShippingClassSettingsCompanyIdArgs = {
  isEditMode: boolean;
  productCompanyId?: string | null;
  userCompanyId?: string | null;
};

const normalizeCompanyId = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const resolveShippingClassSettingsCompanyId = ({
  isEditMode,
  productCompanyId,
  userCompanyId,
}: ResolveShippingClassSettingsCompanyIdArgs): string | null => {
  const normalizedProductCompanyId = normalizeCompanyId(productCompanyId);
  const normalizedUserCompanyId = normalizeCompanyId(userCompanyId);

  if (isEditMode && normalizedProductCompanyId) {
    return normalizedProductCompanyId;
  }

  return normalizedUserCompanyId;
};
