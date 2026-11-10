import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { CustomerDetailsData } from "./types";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

interface CustomerFollowUpsTabProps {
  customer: CustomerDetailsData["customer"];
  onReload: () => void;
}

export const CustomerFollowUpsTab: React.FC<CustomerFollowUpsTabProps> = ({
  customer,
  onReload,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [type, setType] = useState("CALL");
  const [outcome, setOutcome] = useState("ANSWERED");
  const [details, setDetails] = useState("");
  const [nextDate, setNextDate] = useState("");

  const followUpLogs = customer.followUpLog || [];

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      toast.error("يرجى كتابة تفاصيل التواصل أو المتابعة");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.put(`/customers/${customer.id}`, {
        newFollowUpEntry: {
          type,
          outcome,
          details: details.trim(),
          nextFollowUpDate: nextDate || null,
        },
        nextFollowUpDate: nextDate || customer.nextFollowUpDate || undefined,
      });

      toast.success("تم تسجيل عملية التواصل بنجاح");
      setDetails("");
      setNextDate("");
      setShowAddForm(false);
      onReload();
    } catch (err: any) {
      console.error("Error adding follow-up log:", err);
      toast.error(err.response?.data?.message || "فشل في تسجيل المتابعة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (tName: string) => {
    switch (tName) {
      case "CALL":
        return <PhoneIcon className="h-4 w-4 text-blue-500" />;
      case "WHATSAPP":
        return <ChatBubbleLeftRightIcon className="h-4 w-4 text-emerald-500" />;
      case "VISIT":
        return <UserGroupIcon className="h-4 w-4 text-purple-500" />;
      case "OFFER":
        return <DocumentTextIcon className="h-4 w-4 text-amber-500" />;
      case "EMAIL":
        return <EnvelopeIcon className="h-4 w-4 text-rose-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTypeLabel = (tName: string) => {
    switch (tName) {
      case "CALL":
        return "اتصال هاتفي";
      case "WHATSAPP":
        return "محادثة واتساب";
      case "VISIT":
        return "اجتماع / زيارة";
      case "OFFER":
        return "تقديم عرض سعر";
      case "EMAIL":
        return "بريد إلكتروني";
      default:
        return "متابعة عامة";
    }
  };

  const getOutcomeBadge = (oName: string) => {
    switch (oName) {
      case "ANSWERED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            تم الرد والاتفاق
          </span>
        );
      case "FOLLOW_UP":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            طلب متابعة لاحقة
          </span>
        );
      case "NO_ANSWER":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            لم يرد
          </span>
        );
      case "BUSY":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            مشغول
          </span>
        );
      case "NOT_INTERESTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            غير مهتم
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {oName}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Scheduled Follow-Up */}
        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>المتابعة القادمة المجدولة</span>
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
            {customer.nextFollowUpDate
              ? new Date(customer.nextFollowUpDate).toLocaleString("ar-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "لا توجد متابعة مجدولة"}
          </div>
          <span className="text-[10px] text-zinc-400 block">
            {customer.nextFollowUpDate ? "محدد موعد للتواصل القادم" : "يمكنك تحديد موعد عبر تسجيل متابعة جديدة"}
          </span>
        </div>

        {/* Preferred Contact Method */}
        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>طريقة التواصل المفضلة</span>
            <ChatBubbleLeftRightIcon className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {customer.preferredContactMethod === "WHATSAPP" && "رسائل واتساب"}
            {customer.preferredContactMethod === "CALL" && "اتصال هاتفي"}
            {customer.preferredContactMethod === "EMAIL" && "بريد إلكتروني"}
            {!customer.preferredContactMethod && "واتساب"}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {customer.whatsappPhone && (
              <a
                href={`https://wa.me/${customer.whatsappPhone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                محادثة واتساب سريعة
              </a>
            )}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                اتصال الآن
              </a>
            )}
          </div>
        </div>

        {/* Total Interactions Count */}
        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>إجمالي المتابعات والتواصل</span>
            <CheckCircleIcon className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
            {followUpLogs.length}
          </div>
          <span className="text-[10px] text-zinc-400 block">
            سجل تواصل موثق مع العميل
          </span>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            سجل التواصل والمتابعة التاريخي
          </h3>
          <p className="text-xs text-zinc-500">
            توثيق جميع المكالمات والرسائل ومواعيد المتابعة مع العميل
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xs"
        >
          <PlusIcon className="h-4 w-4" />
          <span>{showAddForm ? "إلغاء" : "تسجيل تواصل / متابعة جديدة"}</span>
        </button>
      </div>

      {/* Add Follow-Up Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddFollowUp}
          className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 shadow-xs space-y-4"
        >
          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <SparklesIcon className="h-4 w-4 text-amber-500" />
            <span>تسجيل تفاصيل تواصل جديد مع العميل</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                نوع وسيلة التواصل
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="CALL">اتصال هاتفي</option>
                <option value="WHATSAPP">محادثة واتساب</option>
                <option value="VISIT">اجتماع / زيارة</option>
                <option value="OFFER">تقديم عرض أسعار</option>
                <option value="EMAIL">بريد إلكتروني</option>
                <option value="NOTE">ملاحظة متابعة</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                نتيجة التواصل
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ANSWERED">تم الرد والاتفاق</option>
                <option value="FOLLOW_UP">طلب مهلة / متابعة لاحقة</option>
                <option value="NO_ANSWER">لم يرد</option>
                <option value="BUSY">الرقم مشغول</option>
                <option value="NOT_INTERESTED">غير مهتم حالياً</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                تحديد موعد المتابعة القادمة (اختياري)
              </label>
              <input
                type="datetime-local"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-blue-500/40 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              تفاصيل ما تم في التواصل واستفسارات العميل *
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              required
              placeholder="اكتب هنا ما دار في المكالمة أو المحادثة، الأسئلة التي طرحها العميل، وما تم الاتفاق عليه..."
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !details.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>حفظ وتثبيت المتابعة</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Follow-Up History Timeline */}
      {followUpLogs.length > 0 ? (
        <div className="space-y-3">
          {followUpLogs.map((item, index) => (
            <div
              key={item.id || index}
              className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    {getTypeIcon(item.type)}
                    <span>{getTypeLabel(item.type)}</span>
                  </div>
                  {getOutcomeBadge(item.outcome)}
                </div>

                <div className="text-[11px] text-zinc-500 font-mono tabular-nums flex items-center gap-2">
                  {item.author && (
                    <span className="font-sans font-medium text-zinc-700 dark:text-zinc-300">
                      بواسطة: {item.author}
                    </span>
                  )}
                  <span>•</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {item.details}
              </p>

              {item.nextFollowUpDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium pt-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>
                    موعد المتابعة التالية:{" "}
                    {new Date(item.nextFollowUpDate).toLocaleString("ar-EG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
          <ClockIcon className="h-8 w-8 text-zinc-400 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              لا توجد عمليات تواصل أو متابعة مسجلة حتى الآن
            </h4>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              قم بتوثيق أول مكالمة أو محادثة واتساب مع العميل لتنظيم سجل المبيعات والمتابعة
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>تسجيل أول متابعة للعميل</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerFollowUpsTab;
