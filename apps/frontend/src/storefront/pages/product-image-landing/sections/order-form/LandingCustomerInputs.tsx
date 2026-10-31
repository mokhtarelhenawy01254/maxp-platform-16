import React from "react";
import { EGYPT_GOVERNORATES } from "../../../../../constants/egyptGovernorates";
import type { LandingFormState } from "../../productImageLandingTypes";

export interface LandingCustomerInputsProps {
  formState: LandingFormState;
  updateFormField: (
    field: keyof LandingFormState,
  ) => (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  formError?: string;
}

export const LandingCustomerInputs: React.FC<LandingCustomerInputsProps> = ({
  formState,
  updateFormField,
  formError,
}) => {
  return (
    <>
      <div className="pil-field">
        <label htmlFor="pil-customer-name">الاسم</label>
        <input
          id="pil-customer-name"
          name="customerName"
          value={formState.customerName}
          onChange={updateFormField("customerName")}
          autoComplete="name"
          placeholder="اكتب اسمك بالكامل"
          required
        />
      </div>

      <div className="pil-field">
        <label htmlFor="pil-phone">رقم الموبايل</label>
        <input
          id="pil-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={formState.phone}
          onChange={updateFormField("phone")}
          autoComplete="tel"
          placeholder="01xxxxxxxxx"
          required
        />
      </div>

      <div className="pil-field">
        <label htmlFor="pil-governorate">المحافظة</label>
        <select
          id="pil-governorate"
          name="governorate"
          value={formState.governorate}
          onChange={updateFormField("governorate")}
          required
        >
          <option value="">اختار</option>
          {EGYPT_GOVERNORATES.map((governorate) => (
            <option key={governorate.id} value={governorate.nameAr}>
              {governorate.nameAr}
            </option>
          ))}
        </select>
      </div>

      <div className="pil-field">
        <label htmlFor="pil-area">المنطقة</label>
        <input
          id="pil-area"
          name="area"
          value={formState.area}
          onChange={updateFormField("area")}
          autoComplete="address-level2"
          placeholder="مثال: مدينة نصر"
          required
        />
      </div>

      <div className="pil-field">
        <label htmlFor="pil-address">العنوان بالتفصيل</label>
        <textarea
          id="pil-address"
          name="address"
          value={formState.address}
          onChange={updateFormField("address")}
          autoComplete="street-address"
          placeholder="الشارع، العمارة، الدور، علامة مميزة"
          required
        />
      </div>

      <div className="pil-field">
        <label htmlFor="pil-notes">ملاحظات إضافية للتوصيل (اختياري)</label>
        <input
          id="pil-notes"
          name="notes"
          value={formState.notes || ""}
          onChange={updateFormField("notes")}
          placeholder="مثال: موعد مفضل للتسليم، أو الاتصال قبل الوصول"
        />
      </div>

      {formError ? (
        <div className="pil-error" role="alert">
          {formError}
        </div>
      ) : null}
    </>
  );
};

export default LandingCustomerInputs;
