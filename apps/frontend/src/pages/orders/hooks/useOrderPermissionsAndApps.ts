import { useMemo } from "react";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS,
  ORDER_SOURCE_TRACKING_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../../utils/companyApps";
import type { OrderDetailsType } from "../types";

export interface UseOrderPermissionsAndAppsParams {
  order: OrderDetailsType | null;
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
}

export interface UseOrderPermissionsAndAppsReturn {
  isMerchant: boolean;
  merchantOrderScope: any;
  canEditOrderDetails: boolean;
  canUpdateOrderStatus: boolean;
  canManageTurboShipping: boolean;
  showPartnerOperationsCard: boolean;
  showOrderSourceCard: boolean;
  showOrderAttributionCard: boolean;
  showConfirmationDistributionCard: boolean;
  showLateCancellationButton: boolean;
}

export function useOrderPermissionsAndApps({
  order,
  user,
  company,
}: UseOrderPermissionsAndAppsParams): UseOrderPermissionsAndAppsReturn {
  const isMerchant = user?.role === "MERCHANT";

  const merchantOrderScope = useMemo(
    () =>
      order?.merchantOrder ||
      order?.metadata?.merchantOrder ||
      order?.metadata?.merchantScope ||
      null,
    [order],
  );

  const merchantFulfillmentSource = useMemo(
    () => String(merchantOrderScope?.fulfillmentSource || "").toUpperCase(),
    [merchantOrderScope],
  );

  const isMerchantSelfFulfilledOrder =
    isMerchant && merchantFulfillmentSource === "MERCHANT";

  const canEditOrderDetails = true;
  const canUpdateOrderStatus = !isMerchant || isMerchantSelfFulfilledOrder;
  const canManageTurboShipping = !isMerchant;

  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean),
      ),
    [company, user],
  );

  const hasOrderSourceTrackingApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_SOURCE_TRACKING_APP_SLUGS,
  );
  const hasOrderCampaignAttributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  );
  const hasOrderConfirmationDistributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS,
  );

  const showPartnerOperationsCard = !isMerchant;
  const showOrderSourceCard =
    !isMerchant && (hasOrderSourceTrackingApp || Boolean(order?.conversationId));
  const showOrderAttributionCard = !isMerchant && hasOrderCampaignAttributionApp;
  const showConfirmationDistributionCard =
    !isMerchant && hasOrderConfirmationDistributionApp;

  // Late Cancellation Logic
  const companySettings = useMemo(() => {
    if (!company?.settings) return {};
    try {
      return typeof company.settings === "string"
        ? JSON.parse(company.settings)
        : company.settings;
    } catch {
      return {};
    }
  }, [company?.settings]);

  const lateCancellationInterceptEnabled =
    companySettings?.lateCancellationInterceptEnabled || false;
  const lateCancellationTargetStatuses =
    companySettings?.lateCancellationTargetStatuses || [];

  const showLateCancellationButton = Boolean(
    canUpdateOrderStatus &&
      lateCancellationInterceptEnabled &&
      lateCancellationTargetStatuses.includes(order?.status?.toUpperCase() || ""),
  );

  return {
    isMerchant,
    merchantOrderScope,
    canEditOrderDetails,
    canUpdateOrderStatus,
    canManageTurboShipping,
    showPartnerOperationsCard,
    showOrderSourceCard,
    showOrderAttributionCard,
    showConfirmationDistributionCard,
    showLateCancellationButton,
  };
}
