import React, { useState, useEffect } from "react";
import i18n from "../../i18n";
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  NoSymbolIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { apiService } from "../../services/apiService";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  totalOrders: number;
  customerSince: Date;
  notes?: string;
  rating?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total: number;
  createdAt: Date;
  items: {
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }[];
}

interface CustomerProfileProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder?: () => void;
  pageId?: string; // 🚫 معرف صفحة الفيس بوك (لحظر العميل على صفحة معينة)
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customerId,
  isOpen,
  onClose,
  onCreateOrder,
  pageId,
}) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "notes">(
    "profile",
  );
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlockStatus, setCheckingBlockStatus] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const loadCustomerProfile = async () => {
    try {
      // استخدام apiService للحصول على بيانات العميل
      const [customerProfile, customerOrders] = await Promise.all([
        apiService.getCustomerProfile(customerId),
        apiService.getCustomerOrders(customerId),
      ]);

      setCustomer(customerProfile);
      setOrders(customerOrders);

      // التحقق من حالة الحظر إذا كان pageId متوفراً
      if (pageId) {
        checkBlockStatus();
      }
    } catch (error) {
      console.error("Error loading customer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkBlockStatus = async () => {
    if (!pageId) return;

    try {
      setCheckingBlockStatus(true);
      const status = await apiService.checkCustomerBlockStatus(
        customerId,
        pageId,
      );
      setIsBlocked(status.isBlocked);
    } catch (error) {
      console.error("Error checking block status:", error);
    } finally {
      setCheckingBlockStatus(false);
    }
  };

  const handleBlockCustomer = async () => {
    if (!pageId) {
      alert(i18n.t("CustomerProfile.msg_bf82"));
      return;
    }

    try {
      setBlocking(true);
      await apiService.blockCustomerOnPage(
        customerId,
        pageId,
        blockReason || undefined,
      );
      setIsBlocked(true);
      setShowBlockModal(false);
      setBlockReason("");
      alert(i18n.t("CustomerProfile.msg_8262"));
    } catch (error: any) {
      alert(error.message || "فشل حظر العميل");
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockCustomer = async () => {
    if (!pageId) {
      alert(i18n.t("CustomerProfile.msg_bf82"));
      return;
    }

    if (!confirm("هل أنت متأكد من إلغاء حظر هذا العميل على الصفحة؟")) {
      return;
    }

    try {
      setBlocking(true);
      await apiService.unblockCustomerOnPage(customerId, pageId);
      setIsBlocked(false);
      alert(i18n.t("CustomerProfile.msg_b667"));
    } catch (error: any) {
      alert(error.message || "فشل إلغاء حظر العميل");
    } finally {
      setBlocking(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusArabic = (status: string) => {
    const translations: Record<string, string> = {
      pending: t("orders.status.pending", "Pending"),
      processing: t("orders.status.processing", "Processing"),
      shipped: t("orders.status.shipped", "Shipped"),
      delivered: t("orders.status.delivered", "Delivered"),
      cancelled: t("orders.status.cancelled", "Cancelled"),
    };
    return translations[status] || status;
  };

  const getRatingBadge = (rating?: string) => {
    if (!rating) return null;
    const r = rating.toUpperCase();

    // Define styles mapping
    const styles: Record<string, string> = {
      EXCELLENT: "bg-purple-100 text-purple-700",
      GOOD: "bg-blue-100 text-blue-700",
      AVERAGE: "bg-gray-100 text-gray-700",
      BAD: "bg-red-100 text-red-700",
    };

    // Define translation key mapping
    const translationKeys: Record<string, string> = {
      EXCELLENT: "customers.rating.excellent",
      GOOD: "customers.rating.good",
      AVERAGE: "customers.rating.average",
      BAD: "customers.rating.bad",
    };

    const style = styles[r] || "bg-gray-100 text-gray-700";
    const key = translationKeys[r];

    if (!key) return null;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {t(key)}
      </span>
    );
  };

  useEffect(() => {
    if (customerId && isOpen) {
      loadCustomerProfile();
    }
  }, [customerId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{t("customers.profileTitle", "Customer Profile")}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !customer ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            {t("customers.notFound", "Customer data not found")}
          </div>
        ) : (
          <>
            {/* Customer Info Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={customer.avatar || "/default-avatar.png"}
                    alt={customer.name}
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <h3 className="text-lg font-semibold">{customer.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-600">ID: {customer.id}</p>
                      {getRatingBadge(customer.rating)}
                    </div>
                  </div>
                </div>

                {/* 🚫 زر حظر/إلغاء حظر (فقط إذا كان pageId متوفراً) */}
                {pageId && (
                  <div className="flex items-center space-x-2">
                    {checkingBlockStatus ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                    ) : isBlocked ? (
                      <button
                        onClick={handleUnblockCustomer}
                        disabled={blocking}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>{t("conversations.unblock", "Unblock")}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlockModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <NoSymbolIcon className="w-5 h-5" />
                        <span>{t("conversations.blockOnPage", "Block on page")}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isBlocked && pageId && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    {t("conversations.customerBlockedWarning", "This customer is blocked on the Facebook page - their messages will not be received")}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  {/* إزالة قسم إجمالي الإنفاق نظرًا لعدم توفره حاليًا */}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex">
                {[
                  { key: "profile", label: t("customers.tabs.profile", "Profile") },
                  { key: "orders", label: t("customers.tabs.orders", "Orders") },
                  { key: "notes", label: t("customers.tabs.notes", "Notes") },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 font-medium ${activeTab === tab.key
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "profile" && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("common.email", "Email")}
                      </label>
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <span>{customer.email || t("common.notAvailable", "Not available")}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("common.phone", "Phone")}
                      </label>
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone || t("common.notAvailable", "Not available")}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("customers.joinDate", "Join Date")}
                      </label>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <p>
                          {new Date(customer.customerSince).toLocaleDateString(
                            "ar-EG",
                            { calendar: "gregory" },
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      {t("customers.tabs.orders", "Orders")} ({orders.length})
                    </h3>
                    <button
                      onClick={onCreateOrder}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t("conversations.createNewOrder", "Create new order")}
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {t("customers.noOrders", "No orders")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold">
                                #{order.orderNumber}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "ar-EG",
                                  { calendar: "gregory" },
                                )}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}
                            >
                              {getStatusArabic(order.status)}
                            </span>
                          </div>

                          <p className="text-lg font-semibold text-blue-600">
                            ${order.total}
                          </p>

                          <div className="mt-2 space-y-1">
                            {order.items.slice(0, 2).map((item, index) => (
                              <div
                                key={index}
                                className="text-sm text-gray-600"
                              >
                                {item.name} × {item.quantity}
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <p className="text-sm text-gray-500">
                                {t("common.and", "and")} {order.items.length - 2} {t("common.otherItems", "other items")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "notes" && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">{t("customers.notesTitle", "Customer Notes")}</h3>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[200px]"
                    placeholder={String(
                      t("customers.notesPlaceholder", "Add your notes here..."),
                    )}
                    defaultValue={customer.notes || ""}
                  />
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {t("common.save", "Save")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* 🚫 Modal حظر العميل */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {t("conversations.blockCustomerFacebook", "Block Customer on Facebook Page")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t("conversations.blockCustomerDesc", "This customer will be blocked on the selected Facebook page and their messages will not be received.")}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("conversations.blockReasonLabel", "Block Reason (optional)")}
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder={String(
                    t("conversations.blockReasonPlaceholder", "Enter block reason..."),
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockReason("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  onClick={handleBlockCustomer}
                  disabled={blocking}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {blocking ? t("conversations.blocking", "Blocking...") : t("conversations.confirmBlock", "Confirm Block")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
