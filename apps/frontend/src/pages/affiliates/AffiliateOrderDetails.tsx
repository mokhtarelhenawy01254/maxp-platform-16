import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  PaperAirplaneIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

type MoneyValue = number | string | null | undefined;

interface AffiliateOrderItem {
  id: string;
  quantity: number;
  price: MoneyValue;
  total: MoneyValue;
  productName?: string | null;
  productSku?: string | null;
  productColor?: string | null;
  productSize?: string | null;
  product?: {
    name?: string | null;
    sku?: string | null;
  } | null;
  productVariant?: {
    name?: string | null;
    type?: string | null;
    sku?: string | null;
  } | null;
}

interface AffiliateOrderTicket {
  id: string;
  ticketId: string;
  subject: string;
  description?: string | null;
  category?: string;
  status: string;
  priority?: string;
  orderId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface AffiliateOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  orderSource?: string;
  sourceType?: string | null;
  subtotal: MoneyValue;
  shipping: MoneyValue;
  discount: MoneyValue;
  tax?: MoneyValue;
  total: MoneyValue;
  currency?: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  shippingAddress?: string | null;
  city?: string | null;
  governorate?: string | null;
  notes?: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  orderItems?: AffiliateOrderItem[];
  commissions?: Array<{
    id: string;
    amount: MoneyValue;
    status: string;
  }>;
  shipments?: Array<{
    id: string;
    status: string;
    destinationGovernorate?: string | null;
    destinationCity?: string | null;
    createdAt?: string;
    handlerLabel?: string | null;
  }>;
  merchantOrders?: Array<{
    id: string;
    status: string;
    fulfillmentSource?: string | null;
    createdAt?: string;
    handlerLabel?: string | null;
  }>;
  supportTickets?: AffiliateOrderTicket[];
}

const toNumber = (value: MoneyValue): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const statusLabel = (status?: string): string => {
  const labels: Record<string, string> = {
    PENDING: "معلق",
    CONFIRMED: "مؤكد",
    PROCESSING: "قيد التجهيز",
    SHIPPED: "تم الشحن",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغي",
    RETURNED: "مرتجع",
  };
  return labels[status || ""] || status || "-";
};

const sourceLabel = (source?: string): string => {
  const labels: Record<string, string> = {
    AFFILIATE_REFERRAL: "إحالة",
    AFFILIATE_DIRECT: "طلب مباشر",
    REGULAR: "عادي",
  };
  return labels[source || ""] || source || "-";
};

const ticketStatusLabel = (status?: string): string => {
  const labels: Record<string, string> = {
    OPEN: "مفتوح",
    IN_PROGRESS: "قيد المتابعة",
    RESOLVED: "تم الحل",
    CLOSED: "مغلق",
    PENDING: "منتظر",
    ON_HOLD: "معلق",
  };
  return labels[status || ""] || status || "-";
};

const ticketReasons = [
  { value: "CANCEL_ORDER", label: "العميل عايز يلغي" },
  { value: "CHANGE_ADDRESS", label: "تعديل بيانات الشحن" },
  { value: "SHIPPING_DELAY", label: "متابعة شحن أو تأخير" },
  { value: "CUSTOMER_NOTE", label: "ملاحظة من العميل" },
  { value: "OTHER", label: "طلب آخر" },
];

const parseAddress = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") return parsed;
    return [
      parsed.address,
      parsed.street,
      parsed.area,
      parsed.city,
      parsed.governorate,
    ]
      .filter(Boolean)
      .join("، ");
  } catch {
    return value;
  }
};

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = "" }) => (
  <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${className}`}>
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    {children}
  </section>
);

const InfoRow: React.FC<{
  label: string;
  value?: React.ReactNode;
}> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-gray-700">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-left text-sm font-medium text-gray-900 dark:text-gray-100">
      {value || "-"}
    </span>
  </div>
);

const AffiliateOrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [order, setOrder] = useState<AffiliateOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketReason, setTicketReason] = useState("CANCEL_ORDER");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;

      try {
        setLoading(true);
        const response = await apiClient.get<ApiSuccess<AffiliateOrder>>(
          `/affiliates/orders/${encodeURIComponent(orderId)}`,
        );

        if (response.data.success) {
          setOrder(response.data.data);
        }
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "تعذر تحميل تفاصيل الطلب";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!order) return;
    const message = ticketMessage.trim();

    if (message.length < 5) {
      tToast.error("affiliates_AffiliateOrderDetails.msg_7afd");
      return;
    }

    try {
      setSubmittingTicket(true);
      const response = await apiClient.post<{
        success: boolean;
        data?: { ticket?: AffiliateOrderTicket };
        message?: string;
      }>(`/affiliates/orders/${encodeURIComponent(order.id)}/tickets`, {
        reason: ticketReason,
        message,
      });

      const ticket = response.data.data?.ticket;
      if (response.data.success && ticket) {
        setOrder((current) =>
          current
            ? {
                ...current,
                supportTickets: [ticket, ...(current.supportTickets || [])],
              }
            : current,
        );
        setTicketMessage("");
        toast.success(response.data.message || i18n.t("affiliates_AffiliateOrderDetails.msg_1b99"));
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "تعذر فتح تيكت على الطلب";
      toast.error(message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const customerName = useMemo(() => {
    if (!order) return "-";
    const relatedName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return relatedName || order.customerName || "-";
  }, [order]);

  const customerPhone = order?.customer?.phone || order?.customerPhone || "-";
  const customerEmail = order?.customer?.email || order?.customerEmail || "-";
  const shippingAddress =
    parseAddress(order?.shippingAddress) || order?.customerAddress || "-";
  const commissionTotal = (order?.commissions || []).reduce(
    (sum, commission) => sum + toNumber(commission.amount),
    0,
  );

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className={`min-h-screen px-3 pb-24 pt-4 sm:p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <Link
          to="/affiliates/orders"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          الرجوع للطلبات
        </Link>
        <div className="mt-10 text-center text-gray-500 dark:text-gray-400">
          الطلب غير موجود أو غير مرتبط بحسابك.
        </div>
      </div>
    );
  }

  const panelClass = isDark
    ? "border-gray-700 bg-gray-800 text-gray-100"
    : "border-gray-200 bg-white text-gray-900";
  const mutedText = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-h-screen px-3 pb-24 pt-4 sm:p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="mx-auto max-w-6xl">
        <Link
          to="/affiliates/orders"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-blue-600 transition hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          الرجوع للطلبات
        </Link>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={`text-sm ${mutedText}`}>تفاصيل الطلب</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {order.orderNumber}
            </h1>
            <p className={`mt-2 text-sm ${mutedText}`}>
              {new Date(order.createdAt).toLocaleString("ar-EG")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              {statusLabel(order.status)}
            </span>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
              {sourceLabel(order.orderSource)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className={`rounded-2xl border p-4 shadow-sm ${panelClass}`}>
            <p className={`text-sm ${mutedText}`}>إجمالي الطلب</p>
            <p className="mt-2 text-2xl font-bold">{formatPrice(toNumber(order.total))}</p>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${panelClass}`}>
            <p className={`text-sm ${mutedText}`}>عمولتك</p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatPrice(commissionTotal)}
            </p>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${panelClass}`}>
            <p className={`text-sm ${mutedText}`}>الدفع</p>
            <p className="mt-2 text-lg font-semibold">
              {statusLabel(order.paymentStatus)}
            </p>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${panelClass}`}>
            <p className={`text-sm ${mutedText}`}>الشحن</p>
            <p className="mt-2 text-lg font-semibold">
              {order.shipments?.[0]?.status
                ? statusLabel(order.shipments[0].status)
                : "تتابعه الشركة"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section
              title="المنتجات"
              icon={<ShoppingBagIcon className="h-5 w-5 text-blue-600" />}
              className={panelClass}
            >
              <div className="md:p-0">
                <table className="block min-w-full md:table md:divide-y md:divide-gray-200 dark:md:divide-gray-700">
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        المنتج
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        الكمية
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        السعر
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
                    {(order.orderItems || []).map((item) => {
                      const productName =
                        item.productName || item.product?.name || "منتج";
                      const sku = item.productSku || item.product?.sku;
                      const variant = [
                        item.productVariant?.name,
                        item.productColor,
                        item.productSize,
                      ]
                        .filter(Boolean)
                        .join(" / ");

                      return (
                        <tr
                          key={item.id}
                          className={`block rounded-2xl border p-4 md:table-row md:rounded-none md:border-0 md:p-0 ${
                            isDark
                              ? "border-gray-700 bg-gray-900/35"
                              : "border-gray-100 bg-white"
                          }`}
                        >
                          <td className="pb-3 md:table-cell md:px-3 md:py-3">
                            <p className="font-medium">{productName}</p>
                            <p className={`text-xs ${mutedText}`}>
                              {[sku, variant].filter(Boolean).join(" · ") || "-"}
                            </p>
                          </td>
                          <td className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 text-sm dark:border-gray-700 md:table-cell md:border-0 md:px-3 md:py-3">
                            <span className="text-xs font-medium text-gray-500 md:hidden">
                              الكمية
                            </span>
                            <span>{item.quantity}</span>
                          </td>
                          <td className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 text-sm dark:border-gray-700 md:table-cell md:border-0 md:px-3 md:py-3">
                            <span className="text-xs font-medium text-gray-500 md:hidden">
                              السعر
                            </span>
                            <span>{formatPrice(toNumber(item.price))}</span>
                          </td>
                          <td className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 text-sm font-semibold dark:border-gray-700 md:table-cell md:border-0 md:px-3 md:py-3">
                            <span className="text-xs font-medium text-gray-500 md:hidden">
                              الإجمالي
                            </span>
                            <span>{formatPrice(toNumber(item.total))}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              title="التنفيذ والمتابعة"
              icon={<TruckIcon className="h-5 w-5 text-blue-600" />}
              className={panelClass}
            >
              {order.shipments?.length ? (
                <div className="space-y-3">
                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
                    >
                      <InfoRow
                        label="مسؤول التنفيذ"
                        value={shipment.handlerLabel || "الشركة"}
                      />
                      <InfoRow label="الحالة" value={statusLabel(shipment.status)} />
                      <InfoRow
                        label="الوجهة"
                        value={
                          [shipment.destinationCity, shipment.destinationGovernorate]
                            .filter(Boolean)
                            .join("، ") || "-"
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : !order.merchantOrders?.length ? (
                <p className={mutedText}>
                  الشركة تتابع تجهيز وشحن الطلب من غير إظهار بيانات شركة الشحن.
                </p>
              ) : null}

              {order.merchantOrders?.length ? (
                <div
                  className={`${
                    order.shipments?.length
                      ? "mt-4 border-t border-gray-100 pt-4 dark:border-gray-700"
                      : ""
                  }`}
                >
                  <h3 className="mb-2 text-sm font-semibold">متابعة التنفيذ</h3>
                  <div className="space-y-2">
                    {order.merchantOrders.map((merchantOrder) => (
                      <div
                        key={merchantOrder.id}
                        className="rounded-xl border border-gray-100 p-3 text-sm dark:border-gray-700"
                      >
                        <InfoRow
                          label="مسؤول التنفيذ"
                          value={merchantOrder.handlerLabel || "الشركة"}
                        />
                        <InfoRow
                          label="الحالة"
                          value={statusLabel(merchantOrder.status)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Section>
          </div>

          <div className="space-y-6">
            <Section
              title="العميل"
              icon={<UserIcon className="h-5 w-5 text-blue-600" />}
              className={panelClass}
            >
              <InfoRow label="الاسم" value={customerName} />
              <InfoRow label="الهاتف" value={customerPhone} />
              <InfoRow label="البريد" value={customerEmail} />
              <InfoRow label="العنوان" value={shippingAddress} />
              <InfoRow
                label="المدينة"
                value={[order.city, order.governorate].filter(Boolean).join("، ")}
              />
            </Section>

            <Section
              title="تيكتات الطلب"
              icon={<ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />}
              className={panelClass}
            >
              <div className="space-y-3">
                {(order.supportTickets || []).length ? (
                  <div className="space-y-2">
                    {(order.supportTickets || []).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{ticket.subject}</p>
                            <p className={`mt-1 text-xs ${mutedText}`}>
                              {ticket.ticketId} ·{" "}
                              {new Date(ticket.createdAt).toLocaleDateString("ar-EG")}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            {ticketStatusLabel(ticket.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${mutedText}`}>
                    مفيش تيكتات مفتوحة على الطلب ده.
                  </p>
                )}

                <form className="space-y-3" onSubmit={handleCreateTicket}>
                  <select
                    value={ticketReason}
                    onChange={(event) => setTicketReason(event.target.value)}
                    className={`min-h-11 w-full rounded-xl border px-3 py-2 text-sm ${
                      isDark
                        ? "border-gray-700 bg-gray-900 text-gray-100"
                        : "border-gray-200 bg-white text-gray-900"
                    }`}
                  >
                    {ticketReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={ticketMessage}
                    onChange={(event) => setTicketMessage(event.target.value)}
                    rows={4}
                    placeholder="اكتب تفاصيل طلب العميل..."
                    className={`w-full resize-none rounded-xl border px-3 py-2 text-sm ${
                      isDark
                        ? "border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-500"
                        : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    {submittingTicket ? "جاري فتح التيكت..." : "فتح تيكت على الطلب"}
                  </button>
                </form>
              </div>
            </Section>

            <Section
              title="الملخص المالي"
              icon={<BanknotesIcon className="h-5 w-5 text-blue-600" />}
              className={panelClass}
            >
              <InfoRow label="المنتجات" value={formatPrice(toNumber(order.subtotal))} />
              <InfoRow label="الشحن" value={formatPrice(toNumber(order.shipping))} />
              <InfoRow label="الخصم" value={formatPrice(toNumber(order.discount))} />
              <InfoRow label="الضريبة" value={formatPrice(toNumber(order.tax))} />
              <InfoRow
                label="الإجمالي"
                value={<span className="text-base">{formatPrice(toNumber(order.total))}</span>}
              />
              <InfoRow
                label="العمولة"
                value={
                  <span className="text-base text-green-600">
                    {formatPrice(commissionTotal)}
                  </span>
                }
              />
            </Section>

            <Section
              title="بيانات الطلب"
              icon={<CubeIcon className="h-5 w-5 text-blue-600" />}
              className={panelClass}
            >
              <InfoRow label="المصدر" value={sourceLabel(order.orderSource)} />
              <InfoRow label="طريقة الدفع" value={order.paymentMethod || "-"} />
              <InfoRow label="ملاحظات" value={order.notes || "-"} />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateOrderDetails;
