import React from "react";
import {
  MapPinIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { GovernorateAreaSearch } from "../../../../components/ui/GovernorateAreaSearch";
import { EGYPT_GOVERNORATES } from "../../../../constants/egyptGovernorates";
import { ShippingInfo } from "./types";
import {
  headingStyle,
  mutedStyle,
  dangerStyle,
  successStyle,
  warningStyle,
} from "./styles";
import { DateInput } from '../../../ui/DateInput';

interface QuickOrderDeliveryFormProps {
  city: string;
  setCity: (city: string) => void;
  area: string;
  setArea: (area: string) => void;
  address: string;
  setAddress: (address: string) => void;
  shippingInfo: ShippingInfo | null;
  loadingShipping: boolean;
  isScheduledOrder: boolean;
  setIsScheduledOrder: (isScheduled: boolean) => void;
  scheduledDeliveryDate: string;
  setScheduledDeliveryDate: (date: string) => void;
  scheduledDeliveryTime: string;
  setScheduledDeliveryTime: (time: string) => void;
  scheduledNotes: string;
  setScheduledNotes: (notes: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
}

export const QuickOrderDeliveryForm: React.FC<QuickOrderDeliveryFormProps> = ({
  city,
  setCity,
  area,
  setArea,
  address,
  setAddress,
  shippingInfo,
  loadingShipping,
  isScheduledOrder,
  setIsScheduledOrder,
  scheduledDeliveryDate,
  setScheduledDeliveryDate,
  scheduledDeliveryTime,
  setScheduledDeliveryTime,
  scheduledNotes,
  setScheduledNotes,
  notes,
  setNotes,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Shipping & Location Info */}
      <div className="business-page-panel p-3.5 sm:p-4">
        <h3
          className="mb-3 sm:mb-4 flex items-center gap-2 font-semibold text-sm sm:text-base"
          style={headingStyle}
        >
          <MapPinIcon className="h-5 w-5" style={mutedStyle} />
          عنوان وموقع التوصيل
        </h3>

        <div className="space-y-3 sm:space-y-4">
          {/* Smart Governorate and Area Search */}
          <div>
            <label className="mb-1 block text-xs" style={mutedStyle}>
              البحث الذكي عن المحافظة والمنطقة (شركة الشحن)
            </label>
            <GovernorateAreaSearch
              value={{ governorate: city, area }}
              onChange={(next) => {
                setCity(next.governorate);
                setArea(next.area);
              }}
              placeholder="ابحث عن المحافظة أو المنطقة..."
              searchPlaceholder="اكتب اسم المحافظة أو المدينة..."
              emptyText="لا توجد مناطق مطابقة"
              loadingText="جاري البحث..."
              autoSearchText={address || ""}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs" style={mutedStyle}>
                المحافظة <span style={dangerStyle}>*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="business-control-input w-full text-sm"
              >
                <option value="">اختر المحافظة...</option>
                {EGYPT_GOVERNORATES.map((gov) => (
                  <option key={gov.id} value={gov.nameAr}>
                    {gov.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs" style={mutedStyle}>
                المدينة / المنطقة التابعة
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="المدينة أو المنطقة"
                className="business-control-input w-full text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs" style={mutedStyle}>
              العنوان بالتفصيل
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="business-chat-input h-20 w-full resize-none text-sm"
              placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
            />
          </div>

          {/* Shipping Cost Banner */}
          {loadingShipping ? (
            <div
              className="flex items-center gap-2 text-sm"
              style={mutedStyle}
            >
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--color-primary)" }}
              />
              جاري حساب تكلفة الشحن...
            </div>
          ) : shippingInfo?.zoneId ? (
            <div className="business-status-banner" data-tone="success">
              <div className="flex justify-between items-center">
                <span
                  className="flex items-center gap-2 text-sm"
                  style={successStyle}
                >
                  <TruckIcon className="h-4 w-4" />
                  تكلفة الشحن ({shippingInfo.governorate || city})
                </span>
                <span className="font-bold font-mono tabular-nums" style={successStyle}>
                  {shippingInfo.price.toLocaleString()} ج.م
                </span>
              </div>
              <div className="mt-1 text-xs" style={successStyle}>
                مدة التوصيل: {shippingInfo.deliveryTime}
              </div>
            </div>
          ) : city ? (
            <div className="business-status-banner" data-tone="warning">
              <div
                className="flex items-center gap-2 text-sm"
                style={warningStyle}
              >
                <ExclamationTriangleIcon className="h-4 w-4" />
                لا توجد منطقة شحن مسجلة لهذه المحافظة (سيتم احتساب الشحن 0 ج.م)
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Scheduled Order Section */}
      <div className="business-page-panel p-3.5 sm:p-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isScheduledOrder}
            onChange={(e) => setIsScheduledOrder(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <CalendarIcon className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">
            جدولة الطلب لتسليمه في تاريخ محدد
          </span>
        </label>

        {isScheduledOrder && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  تاريخ التوصيل <span style={dangerStyle}>*</span>
                </label>
                <DateInput
                  value={scheduledDeliveryDate}
                  onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                  min={
                    new Date(Date.now() + 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  }
                  className="business-control-input w-full text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  وقت التوصيل المفضل (اختياري)
                </label>
                <input
                  type="time"
                  value={scheduledDeliveryTime}
                  onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                  className="business-control-input w-full text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                ملاحظات الجدولة والتسليم
              </label>
              <textarea
                value={scheduledNotes}
                onChange={(e) => setScheduledNotes(e.target.value)}
                placeholder="مثال: تسليم بعد الساعة 5 مساءً..."
                className="business-control-input w-full text-xs h-14 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="business-page-panel p-3.5 sm:p-4">
        <label className="mb-1 block text-xs" style={mutedStyle}>
          ملاحظات الطلب (اختياري)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="business-chat-input h-16 w-full resize-none text-sm"
          placeholder="أي ملاحظات إضافية على الطلب..."
        />
      </div>
    </div>
  );
};
