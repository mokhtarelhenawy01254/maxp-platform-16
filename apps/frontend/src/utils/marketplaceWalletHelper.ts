import { toast } from "sonner";
import { NavigateFunction } from "react-router-dom";

export interface WalletErrorDetails {
  code?: string;
  requiredAmount?: number | null;
  currentBalance?: number | null;
  currency?: string;
  message?: string;
}

/**
 * Checks if an API error is due to insufficient company wallet balance.
 */
export function isInsufficientWalletBalance(error: any): boolean {
  if (!error) return false;
  const status = error?.response?.status;
  const data = error?.response?.data;
  const code = data?.code;
  const message = typeof data?.message === "string" ? data.message : "";

  return (
    code === "INSUFFICIENT_WALLET_BALANCE" ||
    status === 402 ||
    message.includes("رصيد المحفظة") ||
    message.includes("المحفظة غير كاف")
  );
}

/**
 * Extracts structured wallet error details from an API error response.
 */
export function extractWalletBalanceError(error: any): WalletErrorDetails {
  const data = error?.response?.data || {};
  return {
    code: data.code || (isInsufficientWalletBalance(error) ? "INSUFFICIENT_WALLET_BALANCE" : undefined),
    requiredAmount: data.requiredAmount !== undefined ? data.requiredAmount : null,
    currentBalance: data.currentBalance !== undefined ? data.currentBalance : null,
    currency: data.currency || "EGP",
    message: data.message || "رصيد المحفظة غير كافٍ لإتمام العملية",
  };
}

export interface WalletRedirectOptions {
  returnUrl?: string;
  appName?: string;
  planToInstall?: string;
  billingCycle?: string;
  itemType?: "app" | "bundle" | "theme" | "agent";
  autoRecharge?: boolean;
}

/**
 * Handles insufficient wallet balance by displaying a clear toast and immediately
 * redirecting the user to /wallet with return context.
 *
 * Returns true if handled, false otherwise.
 */
export function handleInsufficientWalletBalance(
  error: any,
  navigate: NavigateFunction,
  options: WalletRedirectOptions = {}
): boolean {
  if (!isInsufficientWalletBalance(error)) {
    return false;
  }

  const details = extractWalletBalanceError(error);
  const currentReturnUrl = options.returnUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  const currencyLabel = details.currency === "EGP" ? "ج.م" : details.currency || "ج.م";

  let toastTitle = "رصيد المحفظة غير كافٍ — اشحن المحفظة وكمّل التفعيل";
  let toastDescription = "جاري التحويل لصفحة شحن المحفظة...";

  if (details.requiredAmount !== null && details.requiredAmount !== undefined) {
    const reqStr = `${details.requiredAmount} ${currencyLabel}`;
    const balStr = details.currentBalance !== null && details.currentBalance !== undefined
      ? `${details.currentBalance} ${currencyLabel}`
      : null;

    toastTitle = `رصيد المحفظة غير كافٍ (المطلوب: ${reqStr})`;
    toastDescription = balStr
      ? `المتوفر: ${balStr}. جاري نقلك لشحن المحفظة وإكمال التفعيل...`
      : `جاري نقلك لشحن المحفظة وإكمال التفعيل...`;
  }

  toast.error(toastTitle, {
    description: toastDescription,
    duration: 3500,
  });

  // Store in sessionStorage to survive external payment gateway redirects (like Kashier)
  try {
    sessionStorage.setItem("marketplace_wallet_return_url", currentReturnUrl);
    if (options.appName) {
      sessionStorage.setItem("marketplace_wallet_app_name", options.appName);
    }
    if (details.requiredAmount) {
      sessionStorage.setItem("marketplace_wallet_required_amount", String(details.requiredAmount));
    }
  } catch {
    // Graceful ignore
  }

  const searchParams = new URLSearchParams();
  if (currentReturnUrl) searchParams.set("returnUrl", currentReturnUrl);
  if (details.requiredAmount) searchParams.set("requiredAmount", String(details.requiredAmount));
  if (details.currentBalance !== null && details.currentBalance !== undefined) {
    searchParams.set("currentBalance", String(details.currentBalance));
  }
  if (options.appName) searchParams.set("appName", options.appName);
  if (options.planToInstall) searchParams.set("plan", options.planToInstall);
  if (options.billingCycle) searchParams.set("billingCycle", options.billingCycle);
  if (options.itemType) searchParams.set("itemType", options.itemType);
  searchParams.set("action", "recharge");

  const targetPath = `/wallet?${searchParams.toString()}`;

  // Short delay to allow user to read toast before instant transition
  setTimeout(() => {
    navigate(targetPath, {
      state: {
        returnUrl: currentReturnUrl,
        requiredAmount: details.requiredAmount,
        currentBalance: details.currentBalance,
        currency: details.currency,
        appName: options.appName,
        action: "recharge",
      },
    });
  }, 900);

  return true;
}
