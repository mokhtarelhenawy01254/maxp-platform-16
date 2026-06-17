import React, { useEffect, useState } from "react";
import {
  User,
  Phone,
  Mail,
  Clock,
  ShoppingBag,
  Activity,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useCustomerProfile } from "../../../hooks/inbox/useCustomerProfile";
import { InboxConversation } from "../../../types/inbox.types";
import TagInput from "../../../components/facebook-inbox/TagInput/TagInput";
import StatusDropdown from "../../../components/facebook-inbox/StatusDropdown/StatusDropdown";
import AssignmentDropdown from "../../../components/facebook-inbox/AssignmentDropdown/AssignmentDropdown";

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const successStyle: React.CSSProperties = {
  color:
    "color-mix(in srgb, var(--business-success) 74%, var(--color-foreground))",
};

const primaryStyle: React.CSSProperties = {
  color: "var(--color-primary)",
};

interface CustomerPanelProps {
  conversation: InboxConversation;
  onTagsChange: (tags: string[]) => void;
  updatingTags: boolean;
  onStatusChange?: (status: string) => void;
  onAssign?: (userId: string | null) => void;
  disabled?: boolean;
}

type Tab = "info" | "orders" | "timeline";

const CustomerPanel: React.FC<CustomerPanelProps> = ({
  conversation,
  onTagsChange,
  updatingTags,
  onStatusChange,
  onAssign,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const { t, i18n } = useTranslation();

  const {
    customer,
    orders,
    activities,
    loading,
    loadCustomerData,
    calculateLTV,
  } = useCustomerProfile();

  useEffect(() => {
    if (conversation?.customerId) {
      loadCustomerData(conversation.customerId);
    }
  }, [conversation?.customerId, loadCustomerData]);

  const ltv = calculateLTV();

  return (
    <div className="business-inbox-column business-inbox-column--profile">
      <div className="business-inbox-header px-6 text-center">
        {conversation.customerAvatar ? (
          <img
            src={conversation.customerAvatar}
            alt={conversation.customerName}
            className="mx-auto mb-3 h-20 w-20 rounded-full object-cover"
            style={{ border: "2px solid var(--business-card-border)" }}
            width={80}
            height={80}
          />
        ) : (
          <div
            className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
            style={{
              background: "var(--color-primary)",
              color:
                "color-mix(in srgb, var(--color-background) 94%, transparent)",
            }}
          >
            {(conversation.customerName || "?").charAt(0)}
          </div>
        )}
        <h3 className="text-lg font-bold" style={headingStyle}>
          {conversation.customerName}
        </h3>

        <div className="mt-2 flex justify-center">
          <span
            className="business-platform-indicator capitalize"
            data-platform={conversation.platform}
          >
            {conversation.platform}
          </span>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-xs" style={mutedStyle}>
              {t("unifiedInbox.orders")}
            </p>
            <p className="font-semibold" style={headingStyle}>
              {orders.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs" style={mutedStyle}>
              {t("unifiedInbox.orderValue")}
            </p>
            <p className="font-semibold" style={successStyle}>
              {ltv.toLocaleString()} {t("unifiedInbox.egp")}
            </p>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-3 px-4 pt-4"
          style={{ borderTop: "1px solid var(--business-muted-line)" }}
        >
          {onStatusChange && (
            <StatusDropdown
              currentStatus={conversation.status}
              onStatusChange={onStatusChange}
              disabled={disabled}
            />
          )}
          {onAssign && (
            <AssignmentDropdown
              currentAssignee={conversation.assignedTo}
              currentAssigneeName={conversation.assignedToName}
              onAssign={onAssign}
              disabled={disabled}
            />
          )}
        </div>
      </div>

      <div className="business-inbox-tabs mx-4 mt-4">
        <button
          onClick={() => setActiveTab("timeline")}
          className="business-inbox-tab"
          data-active={activeTab === "timeline"}
        >
          <span className="flex items-center justify-center gap-1">
            <Activity size={16} /> {t("unifiedInbox.activity")}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className="business-inbox-tab"
          data-active={activeTab === "orders"}
        >
          <span className="flex items-center justify-center gap-1">
            <ShoppingBag size={16} /> {t("unifiedInbox.orders")}
            {orders.length > 0 && (
              <span className="business-inbox-tab-count">{orders.length}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className="business-inbox-tab"
          data-active={activeTab === "info"}
        >
          <span className="flex items-center justify-center gap-1">
            <User size={16} /> {t("unifiedInbox.info")}
          </span>
        </button>
      </div>

      <div className="business-chat-stage flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <div
              className="h-8 w-8 animate-spin rounded-full border-b-2"
              style={{ borderColor: "var(--color-primary)" }}
            />
          </div>
        ) : (
          <>
            {activeTab === "info" && (
              <div className="space-y-6">
                <div className="business-page-panel p-4">
                  <h4
                    className="mb-3 text-xs font-semibold uppercase"
                    style={mutedStyle}
                  >
                    {t("unifiedInbox.contact")}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone size={16} style={mutedStyle} />
                      <span
                        className="font-mono font-medium"
                        style={headingStyle}
                        dir="ltr"
                      >
                        {customer?.phone || t("unifiedInbox.notAvailable")}
                      </span>
                    </div>
                    {customer?.email &&
                      !customer.email.endsWith("@example.com") && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail size={16} style={mutedStyle} />
                          <span className="truncate" style={headingStyle}>
                            {customer.email}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="business-page-panel p-4">
                  <h4
                    className="mb-3 text-xs font-semibold uppercase"
                    style={mutedStyle}
                  >
                    {t("unifiedInbox.categories")}
                  </h4>
                  <TagInput
                    conversationId={conversation.id}
                    currentTags={conversation.tags}
                    onTagsChange={onTagsChange}
                    disabled={updatingTags}
                  />
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="business-inbox-empty py-8">
                    <ShoppingBag
                      size={48}
                      className="mx-auto mb-2 opacity-20"
                      style={mutedStyle}
                    />
                    <p>{t("unifiedInbox.noOrders")}</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="business-page-panel p-3">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="font-bold" style={headingStyle}>
                            #{order.orderNumber}
                          </p>
                          <p className="text-xs" style={mutedStyle}>
                            {format(new Date(order.createdAt), "dd MMM yyyy", {
                              locale: i18n.language === "ar" ? arSA : enUS,
                            })}
                          </p>
                        </div>
                        <span className="business-chip-button px-2 py-1 text-xs">
                          {order.status}
                        </span>
                      </div>
                      <div
                        className="mt-2 flex items-center justify-between pt-2"
                        style={{
                          borderTop: "1px solid var(--business-muted-line)",
                        }}
                      >
                        <span className="text-xs" style={mutedStyle}>
                          {order.items?.length || 0} {t("unifiedInbox.products")}
                        </span>
                        <span className="font-bold" style={primaryStyle}>
                          {order.total?.toLocaleString() || 0} {t("unifiedInbox.egp")}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          window.open(
                            `/orders/${encodeURIComponent(String(order.id))}`,
                            "_blank",
                          )
                        }
                        className="business-chip-button mt-2 flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium"
                        data-active="true"
                      >
                        <ExternalLink size={14} />
                        {t("unifiedInbox.viewOrder")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "timeline" && (
              <div
                className="relative mr-2 space-y-6 pr-4"
                style={{ borderRight: "2px solid var(--business-muted-line)" }}
              >
                {activities.length === 0 ? (
                  <div className="business-inbox-empty py-8 pr-4">
                    <Clock
                      size={48}
                      className="mx-auto mb-2 opacity-20"
                      style={mutedStyle}
                    />
                    <p>{t("unifiedInbox.noActivity")}</p>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="relative pr-4">
                      <div
                        className="absolute -right-[7px] top-1 h-3 w-3 rounded-full border-2"
                        style={{
                          background: "var(--color-primary)",
                          borderColor: "var(--color-background)",
                          boxShadow:
                            "0 0 0 4px color-mix(in srgb, var(--color-background) 88%, var(--shell-control-bg) 12%)",
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium" style={headingStyle}>
                          {activity.description}
                        </p>
                        <p className="mt-1 text-xs" style={mutedStyle}>
                          {format(
                            new Date(activity.createdAt),
                            "dd MMM, HH:mm",
                            {
                              locale: i18n.language === "ar" ? arSA : enUS,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPanel;
