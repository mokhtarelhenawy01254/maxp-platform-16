import React from "react";
import {
  KeyIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import type {
  ShippingCompany,
  ShippingCompanyFormData,
  TestedProfile,
} from "../types";
import {
  QpExpressWizard,
  BostaWizard,
  TurboWizard,
  ManualFleetWizard,
} from "./ShippingCarrierWizards";
import { ShippingAdvancedSettings } from "./ShippingAdvancedSettings";

export interface ShippingCompanyModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingCompany: ShippingCompany | null;
  formData: ShippingCompanyFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShippingCompanyFormData>>;
  showAdvanced: boolean;
  setShowAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  testedProfile: TestedProfile | null;
  testingConnection: boolean;
  handleTestConnection: (companyId?: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  copyWebhookUrl: () => void;
}

export const ShippingCompanyModal: React.FC<ShippingCompanyModalProps> = ({
  showModal,
  setShowModal,
  editingCompany,
  formData,
  setFormData,
  showAdvanced,
  setShowAdvanced,
  testedProfile,
  testingConnection,
  handleTestConnection,
  handleSubmit,
  copyWebhookUrl,
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto space-y-4 p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <KeyIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingCompany ? `إعدادات ربط ${editingCompany.name}` : "إضافة شركة شحن جديدة"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تهيئة مفاتيح الاتصال البرمجي وتدفق الشحنات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          {/* Provider Wizards */}
          {formData.providerKey === "QP_EXPRESS" && (
            <QpExpressWizard
              formData={formData}
              setFormData={setFormData}
              editingCompany={editingCompany}
              testedProfile={testedProfile}
            />
          )}

          {formData.providerKey === "BOSTA" && (
            <BostaWizard
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {formData.providerKey === "TURBO" && (
            <TurboWizard
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {formData.providerKey === "MANUAL" && (
            <ManualFleetWizard
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {/* Collapsible Advanced Settings (For Developers/Integrators) */}
          <ShippingAdvancedSettings
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            formData={formData}
            setFormData={setFormData}
            copyWebhookUrl={copyWebhookUrl}
          />

          {/* Active Status Checkbox */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <input
              type="checkbox"
              id="modalIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="modalIsActive" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <span className="font-bold text-gray-900 dark:text-white">تفعيل شركة الشحن للعمل بالمتجر فوراً</span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                عند التفعيل تظهر الشركة مباشرة في شحن الطلبات الفردية والجماعية وتوليد البوالص
              </span>
            </label>
          </div>

          {/* Auto Create Shipments Checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="modalAutoCreate"
              checked={formData.autoCreateShipments}
              onChange={(e) => setFormData((prev) => ({ ...prev, autoCreateShipments: e.target.checked }))}
              className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="modalAutoCreate" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              <span className="font-semibold">إنشاء الشحنات تلقائياً</span>
              <span className="block text-[11px] text-gray-400">
                إرسال الطلب لشركة الشحن آلياً بمجرد تأكيد الطلب أو نقله للتجهيز
              </span>
            </label>
          </div>

          {/* Action Buttons & Test Connection */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
            {editingCompany ? (
              <button
                type="button"
                onClick={() => handleTestConnection(editingCompany.id)}
                disabled={testingConnection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${testingConnection ? "animate-spin" : ""}`} />
                <span>فحص واختبار الاتصال</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
