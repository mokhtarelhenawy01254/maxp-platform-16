import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  StarIcon,
  DocumentTextIcon,
  TagIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { CustomerDetailsData } from "./types";
import { DateInput } from '../../../../components/ui/DateInput';

interface CustomerInfoTabProps {
  customer: CustomerDetailsData["customer"];
  customerTags: string[];
  newTag: string;
  onNewTagChange: (val: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  editingBirthday: boolean;
  onEditingBirthdayChange: (val: boolean) => void;
  tempBirthday: string;
  onTempBirthdayChange: (val: string) => void;
  onSaveBirthday: () => void;
}

export const CustomerInfoTab: React.FC<CustomerInfoTabProps> = ({
  customer,
  customerTags,
  newTag,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  editingBirthday,
  onEditingBirthdayChange,
  tempBirthday,
  onTempBirthdayChange,
  onSaveBirthday,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
          {t("customers.contactInfo")}
        </h3>
        <div className="space-y-3">
          {customer.phone && (
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-sm">
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-zinc-400" />
                <span className="font-mono tabular-nums">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${customer.phone}`}
                  className="px-2 py-0.5 text-[11px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                >
                  اتصال
                </a>
                <a
                  href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 text-[11px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  واتساب
                </a>
              </div>
            </div>
          )}

          {customer.whatsappPhone && customer.whatsappPhone !== customer.phone && (
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-sm">
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-emerald-500" />
                <div>
                  <span className="font-mono tabular-nums">{customer.whatsappPhone}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mr-2 font-medium">(رقم الواتساب)</span>
                </div>
              </div>
              <a
                href={`https://wa.me/${customer.whatsappPhone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 text-[11px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                محادثة واتساب
              </a>
            </div>
          )}

          {customer.phone2 && (
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300 text-sm">
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-zinc-400" />
                <div>
                  <span className="font-mono tabular-nums">{customer.phone2}</span>
                  <span className="text-[10px] text-zinc-400 mr-2">(رقم بديل)</span>
                </div>
              </div>
              <a
                href={`tel:${customer.phone2}`}
                className="px-2 py-0.5 text-[11px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                اتصال
              </a>
            </div>
          )}

          {customer.email && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <EnvelopeIcon className="h-4 w-4 text-zinc-400" />
              <span>{customer.email}</span>
            </div>
          )}

          {(customer.address || customer.city || customer.country) && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <MapPinIcon className="h-4 w-4 text-zinc-400" />
              <span>
                {[customer.address, customer.city, customer.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Birthday Inline Editor */}
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
            <CalendarIcon className="h-4 w-4 text-zinc-400" />
            {editingBirthday ? (
              <div className="flex gap-2 w-full max-w-xs items-center">
                <DateInput
                  value={tempBirthday}
                  onChange={(e) => onTempBirthdayChange(e.target.value)}
                  className="flex-1 px-3 py-1 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={onSaveBirthday}
                  className="px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-medium"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => onEditingBirthdayChange(false)}
                  className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span>
                  {customer.birthday
                    ? customer.birthday.split("T")[0].split("-").length === 3
                      ? `${customer.birthday.split("T")[0].split("-")[2]}/${customer.birthday.split("T")[0].split("-")[1]}/${customer.birthday.split("T")[0].split("-")[0]}`
                      : customer.birthday
                    : "تاريخ الميلاد غير مسجل"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onTempBirthdayChange(customer.birthday || "");
                    onEditingBirthdayChange(true);
                  }}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="إضافة / تعديل تاريخ الميلاد"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {customer.customerRating && customer.customerRating !== "UNKNOWN" && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <StarIcon className="h-4 w-4 text-amber-500" />
              <span>التقييم: {customer.customerRating}</span>
            </div>
          )}

          {customer.createdAt && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm font-mono tabular-nums">
              <CalendarIcon className="h-4 w-4 text-zinc-400" />
              <span>عميل منذ {formatDate(customer.createdAt)}</span>
            </div>
          )}

          {customer.updatedAt && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm font-mono tabular-nums">
              <CalendarIcon className="h-4 w-4 text-zinc-400" />
              <span>آخر تحديث {formatDate(customer.updatedAt)}</span>
            </div>
          )}

          {customer.notes ? (
            <div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <DocumentTextIcon className="h-4 w-4 text-zinc-400 mt-0.5" />
              <span>{customer.notes}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tags Management */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
          {t("customers.tagsLabel")}
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {customerTags.length > 0 ? (
            customerTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 group"
              >
                <TagIcon className="h-3 w-3 text-zinc-400" />
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="ml-1 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("customers.noTags")}
            </p>
          )}
        </div>

        {/* Add new tag */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => onNewTagChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddTag()}
            placeholder={t("customers.addTagPlaceholder")}
            className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={onAddTag}
            disabled={!newTag.trim()}
            className="inline-flex items-center px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-xs sm:text-sm font-medium transition-all"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Section: Customer Interests & Work Inquiries */}
      <div className="md:col-span-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>اهتمامات واستفسارات العميل عن الشغل</span>
          </h3>
          <span className="text-[11px] text-zinc-500">تفاصيل متطلبات واحتياجات العميل</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Customer Job / Field */}
          <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">طبيعة عمل العميل / مجاله:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {customer.customerJob || "غير مسجل"}
            </span>
          </div>

          {/* Interests */}
          <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">الخدمات والمنتجات المطلوبة:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {customer.customerInterests || "غير محدد"}
            </span>
          </div>

          {/* Expected Budget */}
          <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">الميزانية المتوقعة / حجم الطلب:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {customer.expectedBudget || "غير محدد"}
            </span>
          </div>
        </div>

        {/* Detailed Inquiries */}
        {customer.inquiryDetails ? (
          <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60 space-y-1">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">تفاصيل الاستفسار وكل ما سأل عنه العميل:</span>
            <p className="text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {customer.inquiryDetails}
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">
            لا توجد تفاصيل استفسارات مسجلة. يمكنك إضافتها عبر تعديل العميل أو تسجيلها في سجل التواصل.
          </p>
        )}
      </div>

      {/* Section: Pipeline & Follow-Up Quick Summary */}
      <div className="md:col-span-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
            مسار المبيعات وموعد المتابعة القادمة
          </h3>
          <span className="text-[11px] text-zinc-500">حالة المتابعة والجدول الزمني</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">مرحلة المتابعة:</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {customer.leadStage === "NEW_LEAD" && "عميل محتمل جديد"}
              {customer.leadStage === "CONTACTED" && "تم التواصل المبدئي"}
              {customer.leadStage === "INTERESTED" && "مهتم واستفسر عن الخدمات"}
              {customer.leadStage === "FOLLOW_UP_SCHEDULED" && "محدد موعد متابعة"}
              {customer.leadStage === "PROPOSAL_SENT" && "تم إرسال عرض السعر"}
              {customer.leadStage === "NEGOTIATION" && "جاري التفاوض"}
              {customer.leadStage === "CONVERTED" && "تم الاتفاق / عميل مؤكد"}
              {customer.leadStage === "NOT_INTERESTED" && "غير مهتم حالياً"}
              {customer.leadStage === "LOST" && "ملغي / مفقود"}
              {!customer.leadStage && "عميل محتمل (Lead)"}
            </span>
          </div>

          <div className="p-2.5 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">أولوية العميل:</span>
            <span className="font-semibold">
              {customer.leadPriority === "HOT" && "🔥 ساخن (مهتم جداً)"}
              {customer.leadPriority === "WARM" && "⚡ دافئ (متوسط)"}
              {customer.leadPriority === "COLD" && "❄️ بارد (استفسار)"}
              {!customer.leadPriority && "⚡ متوسط"}
            </span>
          </div>

          <div className="p-2.5 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">مصدر العميل:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {customer.leadSource === "WHATSAPP" && "واتساب"}
              {customer.leadSource === "FACEBOOK" && "فيسبوك ومسنجر"}
              {customer.leadSource === "INSTAGRAM" && "إنستغرام"}
              {customer.leadSource === "TIKTOK" && "تيك توك"}
              {customer.leadSource === "CALL" && "اتصال هاتفي"}
              {customer.leadSource === "WEBSITE" && "الموقع / المتجر"}
              {customer.leadSource === "REFERRAL" && "ترشيح من عميل"}
              {customer.leadSource === "WALK_IN" && "زيارة مباشرة"}
              {(!customer.leadSource || customer.leadSource === "OTHER") && "أخرى"}
            </span>
          </div>

          <div className="p-2.5 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/70 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">المتابعة القادمة:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {customer.nextFollowUpDate
                ? new Date(customer.nextFollowUpDate).toLocaleString("ar-EG", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "غير محدد"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
