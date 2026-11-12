import React from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  Phone,
  Mail,
  SquarePen,
  X,
  Plus,
  Check,
  MapPin,
  FileText,
  Star,
  Award,
  ShoppingBag,
} from "lucide-react";
import TagInput from "../../TagInput/TagInput";
import { sectionSurfaceStyle, mutedHeadingStyle } from "./styles";
import { InboxConversation } from "../../../../types/inbox.types";

interface CustomerInfoTabProps {
  customer: any;
  conversation: InboxConversation;
  editingPhone: boolean;
  phoneDraft: string;
  setPhoneDraft: (val: string) => void;
  savingPhone: boolean;
  phoneUpdateMessage: string | null;
  handleStartEditPhone: () => void;
  handleSavePhone: () => void;
  setEditingPhone: (val: boolean) => void;
  setPhoneUpdateMessage: (val: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  updatingTags: boolean;
}

export const CustomerInfoTab: React.FC<CustomerInfoTabProps> = ({
  customer,
  conversation,
  editingPhone,
  phoneDraft,
  setPhoneDraft,
  savingPhone,
  phoneUpdateMessage,
  handleStartEditPhone,
  handleSavePhone,
  setEditingPhone,
  setPhoneUpdateMessage,
  onTagsChange,
  updatingTags,
}) => {
  return (
    <div className="space-y-4">
      {/* Contact Info */}
      <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
        <h4
          className="text-xs font-semibold uppercase mb-2"
          style={mutedHeadingStyle}
        >
          التواصل
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone
              size={15}
              style={{ color: "var(--color-muted-foreground)" }}
            />
            {editingPhone ? (
              <input
                autoFocus
                type="tel"
                dir="ltr"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePhone();
                  if (e.key === "Escape") {
                    setEditingPhone(false);
                    setPhoneUpdateMessage(null);
                  }
                }}
                className="business-chat-input flex-1 min-w-0 px-2 py-1 text-sm font-medium font-mono"
                placeholder="01xxxxxxxxx"
                disabled={savingPhone}
              />
            ) : customer?.phone ? (
              <span
                className="font-medium font-mono flex-1 min-w-0 truncate"
                style={{ color: "var(--color-foreground)" }}
                dir="ltr"
              >
                {customer.phone}
              </span>
            ) : null}
            {editingPhone ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleSavePhone}
                  disabled={savingPhone}
                  className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-50"
                  style={{
                    color: "#ffffff",
                    background: "var(--business-success)",
                    borderColor: "transparent",
                    boxShadow:
                      "0 10px 20px -12px color-mix(in srgb, var(--business-success) 70%, transparent)",
                  }}
                  title="حفظ رقم الهاتف"
                  aria-label="حفظ رقم الهاتف"
                >
                  {savingPhone ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                  ) : (
                    <Check size={20} strokeWidth={3} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingPhone(false);
                    setPhoneUpdateMessage(null);
                  }}
                  disabled={savingPhone}
                  className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    color: "var(--business-danger)",
                    background:
                      "color-mix(in srgb, var(--business-danger) 12%, var(--color-card, #ffffff))",
                    borderColor:
                      "color-mix(in srgb, var(--business-danger) 30%, transparent)",
                  }}
                  title="إلغاء"
                  aria-label="إلغاء"
                >
                  <X size={18} />
                </button>
              </div>
            ) : customer?.phone ? (
              <button
                onClick={handleStartEditPhone}
                className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                style={{
                  color: "var(--color-primary)",
                  background:
                    "color-mix(in srgb, var(--color-primary) 12%, var(--color-card, #ffffff))",
                  borderColor:
                    "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                }}
                title="تعديل رقم الهاتف"
                aria-label="تعديل رقم الهاتف"
              >
                <SquarePen size={16} />
              </button>
            ) : null}
          </div>
          {!customer?.phone && !editingPhone && (
            <button
              onClick={handleStartEditPhone}
              className="business-chip-button w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                color: "#ffffff",
                background:
                  "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                border: "none",
                boxShadow:
                  "0 18px 34px -22px color-mix(in srgb, var(--color-primary) 65%, transparent)",
              }}
              title="إضافة رقم الهاتف"
              aria-label="إضافة رقم الهاتف"
            >
              <Plus size={16} />
              إضافة رقم الهاتف
            </button>
          )}
          {phoneUpdateMessage && (
            <p
              className="text-xs"
              style={{
                color:
                  phoneUpdateMessage.startsWith("تم الحفظ:") ||
                  phoneUpdateMessage.includes("تم")
                    ? "var(--business-success)"
                    : "var(--business-danger)",
              }}
            >
              {phoneUpdateMessage}
            </p>
          )}
          {customer?.email && !customer.email.endsWith("@example.com") && (
            <div className="flex items-center gap-2 text-sm">
              <Mail
                size={15}
                style={{ color: "var(--color-muted-foreground)" }}
              />
              <span
                className="truncate"
                style={{ color: "var(--color-foreground)" }}
              >
                {customer.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Classification & Summary */}
      {(customer?.customerRating ||
        customer?.deliveryRate != null ||
        (customer?.totalOrdersCount != null &&
          customer.totalOrdersCount > 0)) && (
        <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
          <h4
            className="text-xs font-semibold uppercase mb-2"
            style={mutedHeadingStyle}
          >
            تصنيف وسجل العميل
          </h4>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {customer?.customerRating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>{customer.customerRating}</span>
              </span>
            )}
            {customer?.totalOrdersCount != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono tabular-nums">
                <ShoppingBag size={13} />
                <span>{customer.totalOrdersCount} طلبات مسجلة</span>
              </span>
            )}
            {customer?.deliveryRate != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono tabular-nums">
                <Award size={13} className="text-emerald-600" />
                <span>{customer.deliveryRate}% نسبة التسليم</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Customer Address */}
      {(customer?.address ||
        customer?.governorate ||
        customer?.city ||
        customer?.area) && (
        <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
          <h4
            className="text-xs font-semibold uppercase mb-2"
            style={mutedHeadingStyle}
          >
            العنوان وموقع التوصيل
          </h4>
          <div className="space-y-1.5 text-xs">
            {(customer.governorate || customer.city) && (
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <MapPin size={14} className="text-primary shrink-0" />
                <span>
                  {[customer.governorate, customer.city, customer.area]
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              </div>
            )}
            {customer.address && (
              <div className="text-muted-foreground pr-5 leading-relaxed">
                {customer.address}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Notes */}
      {customer?.notes && (
        <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
          <h4
            className="text-xs font-semibold uppercase mb-2"
            style={mutedHeadingStyle}
          >
            ملاحظات العميل
          </h4>
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
            <FileText size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span>{customer.notes}</span>
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
        <h4
          className="text-xs font-semibold uppercase mb-2"
          style={mutedHeadingStyle}
        >
          التصنيفات
        </h4>
        <TagInput
          conversationId={conversation.id}
          currentTags={conversation.tags}
          onTagsChange={onTagsChange}
          disabled={updatingTags}
        />
      </div>

      {/* Metadata / Custom Fields */}
      <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
        <h4
          className="text-xs font-semibold uppercase mb-2"
          style={mutedHeadingStyle}
        >
          بيانات أخرى
        </h4>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span style={{ color: "var(--color-muted-foreground)" }}>
              آخر ظهور:
            </span>
            <span
              className="font-medium tabular-nums"
              style={{ color: "var(--color-foreground)" }}
            >
              {conversation.lastMessageTime &&
              !isNaN(new Date(conversation.lastMessageTime).getTime())
                ? format(
                    new Date(conversation.lastMessageTime),
                    "MMM d, HH:mm",
                    { locale: arSA },
                  )
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
