import { useMemo } from "react";
import {
  AFFILIATE_OPERATION_APP_SLUGS,
  AGENT_WORKSPACE_APP_SLUGS,
  MERCHANT_OPERATION_APP_SLUGS,
  ORDER_SOURCE_TRACKING_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../../utils/companyApps";
import type { OrdersFilters } from "../ordersFilterTypes";

export interface UseOrdersOperationPermissionsParams {
  user?: {
    role?: string;
    activeApps?: any[];
    company?: any;
    companies?: any[];
  } | null;
  company?: {
    settings?: any;
    activeApps?: any[];
  } | null;
  isAdmin: boolean;
  isMerchant: boolean;
  filters: OrdersFilters;
  merchantOptions: any[];
  affiliateOptions: any[];
}

export interface UseOrdersOperationPermissionsReturn {
  hasAgentWorkspace: boolean;
  canShowUnifiedOperationFilters: boolean;
  showOrderSourceFilter: boolean;
  showMerchantOperationFilters: boolean;
  showAffiliateOperationFilter: boolean;
  showUnifiedOperationFilters: boolean;
  merchantOperationFilterIsActive: boolean;
  affiliateFilterIsActive: boolean;
  sourceFilterIsActive: boolean;
}

export function useOrdersOperationPermissions({
  user,
  company,
  isAdmin,
  isMerchant,
  filters,
  merchantOptions,
  affiliateOptions,
}: UseOrdersOperationPermissionsParams): UseOrdersOperationPermissionsReturn {
  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean),
      ),
    [company, user],
  );

  const hasAffiliateOperationsApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    AFFILIATE_OPERATION_APP_SLUGS,
  );
  const hasMerchantOperationsApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    MERCHANT_OPERATION_APP_SLUGS,
  );
  const hasAgentWorkspace = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    AGENT_WORKSPACE_APP_SLUGS,
  );

  const merchantOperationFilterIsActive = Boolean(
    (filters.merchantId && filters.merchantId.length > 0) ||
      (filters.fulfillmentSource && filters.fulfillmentSource.length > 0) ||
      (filters.merchantOperationStatus &&
        filters.merchantOperationStatus.length > 0) ||
      (filters.merchantSettlementStatus &&
        filters.merchantSettlementStatus.length > 0),
  );

  const affiliateFilterIsActive = Boolean(
    filters.affiliateId && filters.affiliateId.length > 0,
  );

  const canShowUnifiedOperationFilters = isAdmin && !isMerchant;

  const sourceFilterIsActive = Boolean(
    filters.sourceType && filters.sourceType.length > 0,
  );

  const hasOrderSourceTrackingApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_SOURCE_TRACKING_APP_SLUGS,
  );

  const showOrderSourceFilter =
    canShowUnifiedOperationFilters &&
    (hasOrderSourceTrackingApp || sourceFilterIsActive);

  const showMerchantOperationFilters =
    canShowUnifiedOperationFilters &&
    (merchantOptions.length > 0 ||
      merchantOperationFilterIsActive ||
      hasMerchantOperationsApp);

  const showAffiliateOperationFilter =
    canShowUnifiedOperationFilters &&
    (hasAffiliateOperationsApp ||
      affiliateOptions.length > 0 ||
      affiliateFilterIsActive);

  const showUnifiedOperationFilters =
    showMerchantOperationFilters || showAffiliateOperationFilter;

  return {
    hasAgentWorkspace,
    canShowUnifiedOperationFilters,
    showOrderSourceFilter,
    showMerchantOperationFilters,
    showAffiliateOperationFilter,
    showUnifiedOperationFilters,
    merchantOperationFilterIsActive,
    affiliateFilterIsActive,
    sourceFilterIsActive,
  };
}
