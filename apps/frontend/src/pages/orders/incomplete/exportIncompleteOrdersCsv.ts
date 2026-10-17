import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import type { IncompleteListResponse, IncompleteOrder } from "../incompleteUtils";
import {
  getCustomerContact,
  getCustomerName,
  getGovernorate,
  getLastUpdated,
  getOrderAttribution,
  getStatusLabel,
  getAbandonReasonLabel,
} from "../incompleteUtils";

const escapeCsv = (value: unknown) => {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

export const exportIncompleteOrdersCsv = async (
  buildParams: (pageIndex: number, pageSize: number) => any,
  t: (key: string, opts?: any) => string
): Promise<void> => {
  try {
    const all: IncompleteOrder[] = [];
    const pageSize = 100;
    let pageIndex = 1;
    let total = 1;
    while ((pageIndex - 1) * pageSize < total) {
      const response = await apiClient.get<IncompleteListResponse>(
        "/orders-new/incomplete",
        {
          params: buildParams(pageIndex, pageSize),
        }
      );
      const data = response.data;
      if (!data?.success) break;
      all.push(...(Array.isArray(data.data) ? data.data : []));
      total = data.pagination?.total || 0;
      pageIndex += 1;
    }

    if (!all.length) {
      toast.error(t("orders.incompleteExportFailed"));
      return;
    }

    const headers = [
      t("orders.cartId"),
      t("orders.customerName"),
      t("orders.phone"),
      t("orders.incompleteContactEmail"),
      t("orders.governorate"),
      t("orders.itemsCount"),
      t("orders.total"),
      t("orders.orderStatus"),
      t("orders.incompleteReasonColumn"),
      t("orders.lastUpdated"),
      t("orders.incompleteAdSource"),
      t("orders.incompleteCampaign"),
    ];

    const rows = all.map((o) => {
      const contact = getCustomerContact(o.checkoutData);
      const name = getCustomerName(o.checkoutData);
      const attribution = getOrderAttribution(o);
      const sourceMedium = attribution
        ? [attribution.source, attribution.medium].filter(Boolean).join(" / ")
        : "";
      const campaign = attribution
        ? attribution.campaignName || attribution.campaignId || ""
        : "";
      return [
        o.cartId,
        name || "",
        contact.phone,
        contact.email,
        getGovernorate(o.checkoutData),
        o.itemsCount || 0,
        o.total || 0,
        getStatusLabel(o.status, t),
        getAbandonReasonLabel(o.abandonReason, t),
        getLastUpdated(o),
        sourceMedium,
        campaign,
      ];
    });

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incomplete-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    const apiError = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    toast.error(
      apiError.response?.data?.message ||
        apiError.message ||
        t("orders.incompleteExportFailed")
    );
  }
};
