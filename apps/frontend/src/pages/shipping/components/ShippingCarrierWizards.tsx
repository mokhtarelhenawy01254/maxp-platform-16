import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { ShippingCompany, ShippingCompanyFormData, TestedProfile } from "../types";

export interface CarrierWizardsProps {
  formData: ShippingCompanyFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShippingCompanyFormData>>;
  editingCompany: ShippingCompany | null;
  testedProfile: TestedProfile | null;
}

export const QpExpressWizard: React.FC<CarrierWizardsProps> = ({
  formData,
  setFormData,
  editingCompany,
  testedProfile,
}) => (
  <div className="space-y-3.5">
    <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
            كيو بي إكسبريس (QP Express)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
            ربط مباشر حقيقي (LIVE)
          </span>
        </div>
        {(testedProfile?.customerId || formData.customerId) && (
          <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 rounded-md">
            كود العميل: #{testedProfile?.customerId || formData.customerId}
          </span>
        )}
      </div>

      <p className="text-xs text-indigo-950 dark:text-indigo-300/90 leading-relaxed">
        <strong>متطلبات الربط:</strong> أدخل <strong>اسم المستخدم وكلمة المرور</strong> لحسابك في كيو بي إكسبريس. سيقوم النظام تلقائياً بالتحقق واستخراج كود العميل وبيانات متجرك وربطها بدون خطوات يدوية معقدة.
      </p>

      {(testedProfile?.customerName || (formData.customerId && editingCompany)) && (
        <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            تم التعرف على الحساب بنجاح: <strong>{testedProfile?.customerName || "حساب معتمد"}</strong> (كود العميل #{testedProfile?.customerId || formData.customerId})
          </span>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
          اسم المستخدم أو البريد الإلكتروني *
        </label>
        <input
          type="text"
          required
          value={formData.username}
          onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
          placeholder="مثال: your-account@qpxpress.com"
          className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-[11px] text-gray-400 mt-0.5">اسم الدخول لحسابك في موقع QP Express</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
          كلمة المرور *
        </label>
        <input
          type="password"
          required={!editingCompany || !formData.username}
          value={formData.password}
          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
          placeholder={editingCompany ? "•••••••• (اتركها للإبقاء على الحالية)" : "كلمة مرور حسابك في كيو بي"}
          className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-[11px] text-gray-400 mt-0.5">كلمة مرور حسابك في موقع QP Express</p>
      </div>
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        ملاحظات المعاينة والتسليم الافتراضية للبوليصة (اختياري)
      </label>
      <input
        type="text"
        value={formData.defaultNotes}
        onChange={(e) => setFormData((prev) => ({ ...prev, defaultNotes: e.target.value }))}
        placeholder="مثال: المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      />
      <p className="text-[11px] text-gray-400 mt-0.5">تطبع هذه الملاحظات تلقائياً على كل بوليصة شحن تصدرها لعملائك</p>
    </div>
  </div>
);

export const BostaWizard: React.FC<Pick<CarrierWizardsProps, "formData" | "setFormData">> = ({
  formData,
  setFormData,
}) => (
  <div className="space-y-3.5">
    <div className="p-3.5 bg-gradient-to-r from-orange-50/90 to-amber-50/60 dark:from-orange-950/40 dark:to-amber-950/20 rounded-xl border border-orange-200 dark:border-orange-800/60 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-orange-950 dark:text-orange-200">
          بوستا (Bosta Courier)
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
          ربط مباشر حقيقي (LIVE)
        </span>
      </div>

      <p className="text-xs text-orange-950 dark:text-orange-300/90 leading-relaxed">
        <strong>متطلبات الربط:</strong> مفتاح الـ API الخاص بحسابك في بوستا. يمكنك نسخه من لوحة تحكم بوستا (الإعدادات ⇦ مفاتيح الـ API).
      </p>
    </div>

    <div>
      <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
        مفتاح الـ API (Bosta API Key) *
      </label>
      <input
        type="text"
        required
        value={formData.apiKey}
        onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
        placeholder="ألصق الـ API Key من لوحة تحكم حسابك في بوستا..."
        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500"
      />
      <p className="text-[11px] text-gray-400 mt-0.5">يمكنك نسخه من حسابك في بوستا: الإعدادات ⇦ مفاتيح API</p>
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        عنوان أو كود نقطة الاستلام (Pickup Hub) - اختياري
      </label>
      <input
        type="text"
        value={formData.pickupAddress}
        onChange={(e) => setFormData((prev) => ({ ...prev, pickupAddress: e.target.value }))}
        placeholder="اتركه فارغاً ليتم الاستلام من العنوان الافتراضي لحسابك"
        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      />
    </div>
  </div>
);

export const TurboWizard: React.FC<Pick<CarrierWizardsProps, "formData" | "setFormData">> = ({
  formData,
  setFormData,
}) => (
  <div className="space-y-3.5">
    <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-blue-950 dark:text-blue-200">
          تربو (Turbo Courier)
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
          ربط مباشر حقيقي (LIVE)
        </span>
      </div>
      <p className="text-xs text-blue-950 dark:text-blue-300/90 leading-relaxed">
        أدخل مفتاح الـ API الخاص بحسابك لدى شركة تربو.
      </p>
    </div>

    <div>
      <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
        مفتاح الـ API (Turbo API Key) *
      </label>
      <input
        type="text"
        required
        value={formData.apiKey}
        onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
        placeholder="مفتاح الـ API الخاص بحساب تربو..."
        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          كود العميل الرئيسي (اختياري)
        </label>
        <input
          type="text"
          value={formData.mainClientCode}
          onChange={(e) => setFormData((prev) => ({ ...prev, mainClientCode: e.target.value }))}
          placeholder="كود العميل في تربو..."
          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          هاتف الراسل (اختياري)
        </label>
        <input
          type="text"
          value={formData.senderNumber}
          onChange={(e) => setFormData((prev) => ({ ...prev, senderNumber: e.target.value }))}
          placeholder="رقم الهاتف المسجل..."
          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  </div>
);

export const ManualFleetWizard: React.FC<Pick<CarrierWizardsProps, "formData" | "setFormData">> = ({
  formData,
  setFormData,
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
        اسم شركة الشحن أو المندوب *
      </label>
      <input
        type="text"
        required
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="مثال: أسطول التوصيل الداخلي، مندوب الجيزة..."
        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          رقم هاتف المندوب
        </label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          placeholder="01xxxxxxxxx"
          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          البريد الإلكتروني (اختياري)
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="driver@company.com"
          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  </div>
);
