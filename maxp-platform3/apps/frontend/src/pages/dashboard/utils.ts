import type { DashboardCompany } from "./types";

export const isRequestCancelled = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const cancellableError = error as { name?: string; code?: string };
  return (
    cancellableError.name === "CanceledError" ||
    cancellableError.name === "AbortError" ||
    cancellableError.code === "ERR_CANCELED"
  );
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { message?: string; error?: string } };
      }
    ).response;
    const message = response?.data?.message ?? response?.data?.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const openCompanyStorefront = (
  company: DashboardCompany | null,
  onNavigate: (path: string) => void,
) => {
  if (!company?.slug) {
    onNavigate("/settings/store");
    return;
  }
  window.open(
    `https://${company.slug}.maxp.online`,
    "_blank",
    "noopener,noreferrer",
  );
};

export const runActivationNextAction = (
  nextStepId: string | undefined,
  company: DashboardCompany | null,
  onNavigate: (path: string) => void,
) => {
  switch (nextStepId) {
    case "storefront":
      openCompanyStorefront(company, onNavigate);
      return;
    case "channel":
      onNavigate("/whatsapp");
      return;
    case "orders":
      onNavigate("/orders/manual");
      return;
    case "catalog":
    default:
      onNavigate("/products/new");
  }
};
