import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import {
  ReturnRequest,
  returnService,
  ContactAttempt,
  ActivityLog,
  ReturnType,
  ReturnShippingCompany,
} from "../../services/returnService";
import {
  X,
  Phone,
  MessageCircle,
  Shield,
  Calendar,
  Truck,
  CheckCircle2,
  Bot,
  ArrowRightLeft,
  FileText,
  PlusCircle,
  Edit3,
  User,
  Info
} from 'lucide-react';
import { toast } from "sonner";

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badgeClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  REVIEWED: {
    label: "مراجعة واعتماد المرتجع",
    icon: CheckCircle2,
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
    borderClass: "border-emerald-500 dark:border-emerald-400",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
  },
  AUTO_CREATED: {
    label: "إنشاء طلب إرجاع تلقائي",
    icon: Bot,
    badgeClass:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
    borderClass: "border-blue-500 dark:border-blue-400",
    dotClass: "bg-blue-500 dark:bg-blue-400",
  },
  CONTACT_ATTEMPT: {
    label: "تسجيل محاولة تواصل",
    icon: Phone,
    badgeClass:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
    borderClass: "border-purple-500 dark:border-purple-400",
    dotClass: "bg-purple-500 dark:bg-purple-400",
  },
  STATUS_CHANGE: {
    label: "تغيير حالة المرتجع",
    icon: ArrowRightLeft,
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
    borderClass: "border-amber-500 dark:border-amber-400",
    dotClass: "bg-amber-500 dark:bg-amber-400",
  },
  NOTE_ADDED: {
    label: "ملاحظة إدارية",
    icon: FileText,
    badgeClass:
      "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    borderClass: "border-slate-400 dark:border-slate-500",
    dotClass: "bg-slate-500 dark:bg-slate-400",
  },
  UPDATED: {
    label: "تعديل بيانات المرتجع",
    icon: Edit3,
    badgeClass:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40",
    borderClass: "border-indigo-500 dark:border-indigo-400",
    dotClass: "bg-indigo-500 dark:bg-indigo-400",
  },
  CREATED: {
    label: "إنشاء طلب إرجاع يدوي",
    icon: PlusCircle,
    badgeClass:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40",
    borderClass: "border-cyan-500 dark:border-cyan-400",
    dotClass: "bg-cyan-500 dark:bg-cyan-400",
  },
};

const renderRoleBadge = (role?: string) => {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === "OWNER") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
        مالك الحساب
      </span>
    );
  }
  if (upper === "ADMIN") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
        مدير
      </span>
    );
  }
  if (upper === "MODERATOR") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
        مشرف
      </span>
    );
  }
  if (upper === "EMPLOYEE") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        موظف
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
      {role}
    </span>
  );
};

const FIELD_LABELS: Record<string, string> = {
  responsibleParty: "الجهة المسؤولة",
  reason: "سبب الإرجاع",
  shippingCompany: "شركة الشحن",
  returnType: "نوع المرتجع",
  shippingReturnCost: "تكلفة الشحن الراجع",
  settlementAmount: "صافي التسوية",
  customerNotes: "ملاحظات العميل",
  adminNotes: "ملاحظات الإدارة",
  refundAmount: "المبلغ المسترد",
};

const parseResponsibleParty = (party?: string | null) => {
  if (!party) return null;
  switch (party) {
    case "CUSTOMER":
      return "العميل";
    case "SHIPPING":
    case "SHIPPING_COMPANY":
      return "شركة الشحن";
    case "STORE":
      return "المتجر";
    case "OTHER":
      return "أخرى";
    default:
      return party;
  }
};

const CONTACT_RESULTS_MAP: Record<string, string> = {
  NO_ANSWER: "لم يرد",
  ANSWERED: "تم الرد",
  BUSY: "مشغول",
  WRONG_NUMBER: "رقم خاطئ",
  CALL_BACK_LATER: "إعادة اتصال لاحقاً",
};

interface ReturnDetailsModalProps {
  request: ReturnRequest;
  onClose: () => void;
  onUpdate: () => void;
}

const ReturnDetailsModal: React.FC<ReturnDetailsModalProps> = ({
  request,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "details" | "contact" | "activity"
  >("details");
  const [contactHistory, setContactHistory] = useState<ContactAttempt[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Contact Form
  const [contactMethod, setContactMethod] = useState("PHONE");
  const [contactResult, setContactResult] = useState("NO_ANSWER");
  const [contactNotes, setContactNotes] = useState("");

  // Review Form
  const [reasonId, setReasonId] = useState(request.reasonId || "");
  const [customerNotes, setCustomerNotes] = useState(
    request.customerNotes || "",
  );
  const [responsibleParty, setResponsibleParty] = useState(
    request.responsibleParty || "",
  );
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || "");
  const [shippingReturnCost, setShippingReturnCost] = useState(
    request.shippingReturnCost !== undefined && request.shippingReturnCost !== null
      ? String(request.shippingReturnCost)
      : "",
  );
  const [settlementAmount, setSettlementAmount] = useState(
    request.settlementAmount !== undefined && request.settlementAmount !== null
      ? String(request.settlementAmount)
      : "",
  );
  const isReviewed = true;
  const [submittingReview, setSubmittingReview] = useState(false);

  // Return Type & Shipping Company
  const [shippingCompanies, setShippingCompanies] = useState<
    ReturnShippingCompany[]
  >([]);
  const [returnTypes, setReturnTypes] = useState<ReturnType[]>([]);
  const [shippingCompanyId, setShippingCompanyId] = useState(
    request.shippingCompanyId || "",
  );
  const [returnTypeId, setReturnTypeId] = useState(request.returnTypeId || "");

  // Categories & Reasons for dropdown
  const [categories, setCategories] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);

  const responsiblePartyOptions = categories.reduce((acc: any[], cat: any) => {
    if (!acc.find((a) => a.value === cat.defaultRole)) {
      acc.push({ value: cat.defaultRole, label: cat.name });
    }
    return acc;
  }, []);

  // Activity Log Filter
  const [activityFilter, setActivityFilter] = useState<string>("");

  useEffect(() => {
    if (activeTab !== "details") {
      fetchLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    returnService.getCategories().then((res) => setCategories(res.data)).catch(() => {});
    returnService.getReasons().then((res) => setReasons(res.data)).catch(() => {});
  }, []);

  const getSuggestedCost = (type: ReturnType | undefined): number => {
    if (!type) return 0;
    if (type.costModel === "FIXED" && type.fixedAmount != null) {
      const fixed = Number(type.fixedAmount);
      return isNaN(fixed) ? 0 : fixed;
    }
    if (type.costModel === "NONE") {
      return 0;
    }
    if (type.costModel === "FULL") {
      const o = request.order as any;
      const rawCost = o?.shippingCost ?? o?.shipping ?? 0;
      const parsed = Number(rawCost);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // When a return type is selected, suggest the return shipping cost based on the cost model
  const applyReturnTypeCost = (type: ReturnType | undefined) => {
    if (!type) return;
    const cost = getSuggestedCost(type);
    setShippingReturnCost(String(cost));
  };

  // Load active shipping companies and their return types
  useEffect(() => {
    returnService
      .getReturnShippingCompanies({ activeOnly: true })
      .then((res) => {
        const companies: ReturnShippingCompany[] = res.data?.data || [];
        const activeCompanies = companies.filter((c) => c.isActive !== false);
        setShippingCompanies(activeCompanies);

        // Auto-resolve active shipping company if not already set on request
        let resolvedCompanyId = request.shippingCompanyId || "";
        if (!resolvedCompanyId) {
          if (activeCompanies.length === 1) {
            resolvedCompanyId = activeCompanies[0].id;
          } else if (
            request.order?.turboTrackingNumber ||
            (request.order as any)?.turboShipmentId
          ) {
            const turbo = activeCompanies.find(
              (c) =>
                c.slug?.toLowerCase() === "turbo" ||
                c.providerKey?.toUpperCase() === "TURBO" ||
                c.name?.toLowerCase().includes("turbo")
            );
            if (turbo) {
              resolvedCompanyId = turbo.id;
            }
          }
        }

        if (resolvedCompanyId) {
          setShippingCompanyId(resolvedCompanyId);
          const company = activeCompanies.find((c) => c.id === resolvedCompanyId);
          const activeTypes = (company?.returnTypes || []).filter(
            (rt) => rt.isActive !== false
          );
          setReturnTypes(activeTypes);

          if (
            request.returnTypeId &&
            (request.shippingReturnCost === undefined ||
              request.shippingReturnCost === null ||
              request.shippingReturnCost === ("" as any))
          ) {
            const matchedType =
              activeTypes.find((rt) => rt.id === request.returnTypeId) ||
              activeCompanies
                .flatMap((c) => c.returnTypes || [])
                .find((rt) => rt.id === request.returnTypeId);
            if (matchedType) {
              applyReturnTypeCost(matchedType);
            }
          }
        } else {
          // If no shipping company is resolved yet, make all active return types available
          const allActiveTypes = activeCompanies
            .flatMap((c) => c.returnTypes || [])
            .filter((rt) => rt.isActive !== false);
          setReturnTypes(allActiveTypes);

          if (
            request.returnTypeId &&
            (request.shippingReturnCost === undefined ||
              request.shippingReturnCost === null ||
              request.shippingReturnCost === ("" as any))
          ) {
            const matchedType = allActiveTypes.find(
              (rt) => rt.id === request.returnTypeId
            );
            if (matchedType) {
              applyReturnTypeCost(matchedType);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleShippingCompanyChange = (value: string) => {
    setShippingCompanyId(value);
    setReturnTypeId("");
    if (!value) {
      const allActiveTypes = shippingCompanies
        .flatMap((c) => c.returnTypes || [])
        .filter((rt) => rt.isActive !== false);
      setReturnTypes(allActiveTypes);
      return;
    }
    const company = shippingCompanies.find((c) => c.id === value);
    const activeTypes = (company?.returnTypes || []).filter(
      (rt) => rt.isActive !== false
    );
    setReturnTypes(activeTypes);
  };

  const handleReturnTypeChange = (value: string) => {
    setReturnTypeId(value);
    if (!value) {
      setShippingReturnCost("");
      return;
    }
    const type =
      returnTypes.find((rt) => rt.id === value) ||
      shippingCompanies
        .flatMap((c) => c.returnTypes || [])
        .find((rt) => rt.id === value);

    if (type) {
      if (type.shippingCompanyId && !shippingCompanyId) {
        setShippingCompanyId(type.shippingCompanyId);
      }
      applyReturnTypeCost(type);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      if (activeTab === "contact") {
        const res = await returnService.getContactHistory(request.id);
        setContactHistory(res.data);
      } else if (activeTab === "activity") {
        const res = await returnService.getActivityLog(request.id);
        setActivityLog(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveReview = async () => {
    if (!responsibleParty) {
      toast.error(t('returns.k_117'));
      return;
    }
    setSubmittingReview(true);
    try {
      await returnService.updateRequest(request.id, {
        reasonId: reasonId || undefined,
        customerNotes,
        responsibleParty,
        adminNotes,
        isReviewed,
        returnTypeId: returnTypeId || undefined,
        shippingCompanyId: shippingCompanyId || undefined,
        shippingReturnCost:
          shippingReturnCost === "" ? null : parseFloat(shippingReturnCost),
        settlementAmount:
          settlementAmount === "" ? null : parseFloat(settlementAmount),
      });
      toast.success(t('returns.k_119'));
      onUpdate();
    } catch (error) {
      toast.error(t('returns.k_120'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await returnService.addContactAttempt(request.id, {
        method: contactMethod,
        result: contactResult,
        notes: contactNotes,
      });
      toast.success(t('returns.k_121'));
      setContactMethod("PHONE");
      setContactResult("NO_ANSWER");
      setContactNotes("");
      fetchLogs();
    } catch (error) {
      toast.error(t('returns.k_122'));
    }
  };

  const renderActivityDetails = (log: ActivityLog) => {
    let details: any = log.details;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {
        // Keep as string
      }
    }

    // 1. REVIEWED
    if (log.action === "REVIEWED") {
      const resParty = parseResponsibleParty(
        details?.responsibleParty || request.responsibleParty
      );
      const reasonTitle =
        details?.reason ||
        details?.category ||
        request.reason?.reason ||
        (request.reasonId && reasons.find((r) => r.id === request.reasonId)?.reason);
      const shippingName =
        details?.shippingCompany ||
        request.shippingCompany?.name ||
        (request.shippingCompanyId &&
          shippingCompanies.find((s) => s.id === request.shippingCompanyId)?.name);
      const returnTypeName =
        details?.returnType ||
        request.returnType?.name ||
        (request.returnTypeId &&
          returnTypes.find((rt) => rt.id === request.returnTypeId)?.name);
      const returnCost =
        details?.shippingReturnCost !== undefined && details?.shippingReturnCost !== null
          ? details.shippingReturnCost
          : request.shippingReturnCost;
      const settlement =
        details?.settlementAmount !== undefined && details?.settlementAmount !== null
          ? details.settlementAmount
          : request.settlementAmount;
      const admNotes = details?.adminNotes || request.adminNotes;
      const custNotes = details?.customerNotes || request.customerNotes;

      const hasFields =
        resParty ||
        reasonTitle ||
        shippingName ||
        returnTypeName ||
        returnCost != null ||
        settlement != null ||
        admNotes ||
        custNotes;

      if (!hasFields) {
        return (
          <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تمت مراجعة طلب الإرجاع واعتماده بنجاح.</span>
          </div>
        );
      }

      return (
        <div className="bg-white dark:bg-gray-800/90 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {resParty && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">الجهة المسؤولة:</span>
                <span className="font-bold text-gray-900 dark:text-white px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {resParty}
                </span>
              </div>
            )}

            {reasonTitle && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">سبب الإرجاع:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {reasonTitle}
                </span>
              </div>
            )}

            {shippingName && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">شركة الشحن:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {shippingName}
                </span>
              </div>
            )}

            {returnTypeName && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">نوع المرتجع:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {returnTypeName}
                </span>
              </div>
            )}

            {returnCost != null && returnCost !== "" && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">تكلفة الشحن الراجع:</span>
                <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {returnCost} {request.order?.currency || "ج.م"}
                </span>
              </div>
            )}

            {settlement != null && settlement !== "" && (
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">صافي التسوية:</span>
                <span
                  className={`font-bold tabular-nums ${
                    Number(settlement) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {settlement} {request.order?.currency || "ج.م"}
                </span>
              </div>
            )}
          </div>

          {admNotes && (
            <div className="text-xs p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="text-amber-800 dark:text-amber-300 font-semibold block mb-0.5">
                ملاحظات الإدارة:
              </span>
              <p className="text-gray-700 dark:text-gray-300">{admNotes}</p>
            </div>
          )}

          {custNotes && (
            <div className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400 font-semibold block mb-0.5">
                ملاحظات العميل:
              </span>
              <p className="text-gray-700 dark:text-gray-300">{custNotes}</p>
            </div>
          )}
        </div>
      );
    }

    // 2. AUTO_CREATED
    if (log.action === "AUTO_CREATED") {
      return (
        <div className="text-xs text-blue-900 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
          <Bot size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            {typeof details === "string" && details.length > 0
              ? details
              : "تم إنشاء طلب الإرجاع تلقائياً بواسطة النظام لتحديث حالة الطلب إلى مرتجع"}
          </span>
        </div>
      );
    }

    // 3. CONTACT_ATTEMPT
    if (log.action === "CONTACT_ATTEMPT") {
      const method = details?.method || "PHONE";
      const result = details?.result || "NO_ANSWER";
      const notes = details?.notes;

      return (
        <div className="text-xs bg-purple-50/70 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 dark:text-gray-400">وسيلة التواصل:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {method === "WHATSAPP" ? "واتساب (WhatsApp)" : "مكالمة هاتفية (Phone)"}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-500 dark:text-gray-400">النتيجة:</span>
            <span className="font-semibold text-purple-700 dark:text-purple-300">
              {CONTACT_RESULTS_MAP[result] || result}
            </span>
          </div>
          {notes && (
            <p className="text-gray-700 dark:text-gray-300 text-xs mt-1 border-t border-purple-100 dark:border-purple-900/30 pt-1">
              "{notes}"
            </p>
          )}
        </div>
      );
    }

    // 4. STATUS_CHANGE
    if (log.action === "STATUS_CHANGE") {
      return (
        <div className="text-xs bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">تغيير الحالة:</span>
            <span className="font-semibold px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-gray-800 dark:text-white">
              {details?.from || "—"}
            </span>
            <ArrowRightLeft size={12} className="text-amber-600 dark:text-amber-400" />
            <span className="font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200">
              {details?.to || "—"}
            </span>
          </div>
          {details?.reason && (
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">السبب: {details.reason}</p>
          )}
        </div>
      );
    }

    // 5. UPDATED
    if (log.action === "UPDATED") {
      return (
        <div className="text-xs bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-2">
          <span className="font-medium text-indigo-900 dark:text-indigo-200 block">
            {details?.description || "تم تعديل بيانات طلب الإرجاع:"}
          </span>
          {details?.changes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {Object.entries(details.changes).map(([field, change]: [string, any]) => (
                <div
                  key={field}
                  className="bg-white dark:bg-gray-800 p-2 rounded border border-indigo-100 dark:border-indigo-900/40 text-xs"
                >
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] mb-0.5">
                    {FIELD_LABELS[field] || field}
                  </span>
                  <span className="text-red-500 line-through mr-1">
                    {String(change?.from ?? "فارغ")}
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {" "}← {String(change?.to ?? "فارغ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 6. NOTE_ADDED
    if (log.action === "NOTE_ADDED") {
      const noteText =
        typeof details === "object" && details?.note
          ? details.note
          : typeof details === "string"
          ? details
          : null;

      return (
        <div className="text-xs bg-slate-50 dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 block mb-1">الملاحظة:</span>
          <p className="text-gray-800 dark:text-gray-200 font-medium">
            {noteText || "تم تحديث الملاحظات الإدارية"}
          </p>
        </div>
      );
    }

    // 7. CREATED
    if (log.action === "CREATED") {
      return (
        <div className="text-xs text-cyan-900 dark:text-cyan-200 bg-cyan-50/70 dark:bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-100 dark:border-cyan-900/30 flex items-center gap-2">
          <PlusCircle size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>تم إنشاء طلب الإرجاع في النظام</span>
        </div>
      );
    }

    // Fallback: don't render empty objects
    if (!details || (typeof details === "object" && Object.keys(details).length === 0)) {
      return null;
    }

    return (
      <div className="text-xs bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
        {typeof details === "string" ? details : JSON.stringify(details)}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col shadow-xl mx-2 md:mx-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {t('returns.k_189')}{request.order?.orderNumber}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(request.createdAt).toLocaleString("ar-EG")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "details" ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            {t('returns.k_190')}
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "contact" ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            {t('returns.k_191')}
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "activity" ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            {t('returns.k_192')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* COD Deposit & Shipping */}
              {(request.order?.codDepositPaid || request.shippingReturnCost) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                    💰 التسوية المالية
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {request.order?.codDepositPaid && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">دفعة مسبقة (COD Deposit):</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {request.order.codDepositAmount} {request.order.currency}
                          {request.order.codDepositRefunded ? " ✅ مستردة" : " ❌ لم تسترد"}
                        </span>
                      </div>
                    )}
                    {request.shippingReturnCost && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">تكلفة الشحن الراجع:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {request.shippingReturnCost} {request.order?.currency}
                        </span>
                      </div>
                    )}
                    {request.settlementAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">صافي التسوية:</span>
                        <span className={`font-medium ${request.settlementAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {request.settlementAmount} {request.order?.currency}
                        </span>
                      </div>
                    )}
                    {request.productCondition && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">حالة المنتج عند الاستلام:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{request.productCondition}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced Review Form */}
              <div className="bg-white dark:bg-gray-900/50 border-2 border-blue-100 dark:border-blue-900/30 p-4 rounded-lg space-y-4">
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <Shield size={16} /> {t('returns.k_201')}
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('returns.k_202')}
                  </label>
                  <select
                    value={responsibleParty}
                    onChange={(e) => {
                      setResponsibleParty(e.target.value as any);
                      setReasonId("");
                    }}
                    className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  >
                    <option value="">{t('returns.k_30')}</option>
                    {responsiblePartyOptions.map((opt: any) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('returns.k_154')}
                  </label>
                  <select
                    value={reasonId}
                    onChange={(e) => {
                      const selectedReason = reasons.find((r) => r.id === e.target.value);
                      setReasonId(e.target.value);
                      if (selectedReason?.category?.defaultRole) {
                        setResponsibleParty(selectedReason.category.defaultRole);
                      }
                    }}
                    className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  >
                    <option value="">{t('returns.k_30')}</option>
                    {categories
                      .filter((cat: any) => cat.defaultRole === responsibleParty)
                      .map((cat: any) => (
                        <optgroup key={cat.id} label={cat.name}>
                          {reasons
                            .filter((r: any) => r.categoryId === cat.id)
                            .map((reason: any) => (
                              <option key={reason.id} value={reason.id}>
                                {reason.reason}
                                {reason.description && ` - ${reason.description}`}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    {reasons.filter((r: any) => {
                      const cat = categories.find((c: any) => c.id === r.categoryId);
                      return !cat || cat.defaultRole === 'OTHER';
                    }).length > 0 && (
                      <optgroup label={t('returns.k_31')}>
                        {reasons
                          .filter((r: any) => {
                            const cat = categories.find((c: any) => c.id === r.categoryId);
                            return !cat || cat.defaultRole === 'OTHER';
                          })
                          .map((reason: any) => (
                            <option key={reason.id} value={reason.id}>
                              {reason.reason}
                              {reason.description && ` - ${reason.description}`}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('returns.k_156')}
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={2}
                    placeholder={t('returns.k_35')}
                    className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('returns.k_207')}
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('returns.k_254')}
                    </label>
                    <select
                      value={shippingCompanyId}
                      onChange={(e) =>
                        handleShippingCompanyChange(e.target.value)
                      }
                      className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                    >
                      <option value="">{t('returns.k_264') || "-- اختر شركة الشحن --"}</option>
                      {shippingCompanies.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('returns.k_255')}
                    </label>
                    <select
                      value={returnTypeId}
                      onChange={(e) => handleReturnTypeChange(e.target.value)}
                      disabled={returnTypes.length === 0}
                      className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md disabled:opacity-50"
                    >
                      <option value="">{t('returns.k_265') || "-- اختر نوع المرتجع --"}</option>
                      {returnTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {returnTypeId &&
                  (() => {
                    const rt =
                      returnTypes.find((x) => x.id === returnTypeId) ||
                      shippingCompanies
                        .flatMap((c) => c.returnTypes || [])
                        .find((x) => x.id === returnTypeId);
                    if (!rt) return null;
                    const suggested = getSuggestedCost(rt);
                    const currency = request.order?.currency || t('returns.k_22');
                    return (
                      <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-medium bg-blue-50/80 dark:bg-blue-900/20 p-2.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                        <Truck size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>
                          {t('returns.k_256')}:{" "}
                          <strong className="font-bold text-blue-900 dark:text-blue-100 underline decoration-blue-400">
                            {suggested} {currency}
                          </strong>
                        </span>
                      </p>
                    );
                  })()}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('returns.k_228')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={shippingReturnCost}
                      onChange={(e) => setShippingReturnCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('returns.k_229')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="space-y-6">
              {/* Add Attempt Form */}
              <form
                onSubmit={handleAddContact}
                className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Phone size={16} /> {t('returns.k_209')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('returns.k_210')}
                    </label>
                    <select
                      value={contactMethod}
                      onChange={(e) => setContactMethod(e.target.value)}
                      className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                    >
                      <option value="PHONE">{t('returns.k_126')}</option>
                      <option value="WHATSAPP">{t('returns.k_127')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('returns.k_211')}
                    </label>
                    <select
                      value={contactResult}
                      onChange={(e) => setContactResult(e.target.value)}
                      className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                    >
                      <option value="NO_ANSWER">{t('returns.k_128')}</option>
                      <option value="ANSWERED">{t('returns.k_129')}</option>
                      <option value="BUSY">{t('returns.k_130')}</option>
                      <option value="WRONG_NUMBER">{t('returns.k_131')}</option>
                      <option value="CALL_BACK_LATER">
                        {t('returns.k_212')}
                      </option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('returns.k_213')}
                  </label>
                  <textarea
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                    className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                    rows={2}
                    placeholder={t('returns.k_132')}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {t('returns.k_214')}
                </button>
              </form>

              {/* History List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t('returns.k_215')}
                </h3>
                {loadingLogs ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                    {t('returns.k_144')}
                  </p>
                ) : contactHistory.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-gray-400 dark:text-gray-500 text-sm">
                    {t('returns.k_216')}
                  </div>
                ) : (
                  contactHistory.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex items-start gap-3"
                    >
                      <div
                        className={`p-2 rounded-full ${attempt.method === "WHATSAPP" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}
                      >
                        {attempt.method === "WHATSAPP" ? (
                          <MessageCircle size={16} />
                        ) : (
                          <Phone size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-gray-900 dark:text-white block mb-1">
                              {attempt.user?.firstName} {attempt.user?.lastName}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                              {attempt.result}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(attempt.createdAt).toLocaleString(
                              "ar-EG",
                            )}
                          </span>
                        </div>
                        {attempt.notes && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            "{attempt.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              {loadingLogs ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm">{t('returns.k_144')}</p>
                </div>
              ) : (
                <>
                  {/* Action Filters */}
                  <div className="flex gap-2 flex-wrap border-b border-gray-100 dark:border-gray-700 pb-3">
                    <button
                      onClick={() => setActivityFilter("")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        activityFilter === ""
                          ? "bg-blue-600 dark:bg-blue-500 text-white shadow-xs"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t('returns.k_13')} ({activityLog.length})
                    </button>
                    {Array.from(new Set(activityLog.map((l) => l.action))).map((action) => {
                      const meta = ACTION_CONFIG[action];
                      const count = activityLog.filter((l) => l.action === action).length;
                      return (
                        <button
                          key={action}
                          onClick={() => setActivityFilter(action)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            activityFilter === action
                              ? "bg-blue-600 dark:bg-blue-500 text-white shadow-xs"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {meta?.label || action}
                          <span className="opacity-70 text-[10px] tabular-nums">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {activityLog.filter((l) => !activityFilter || l.action === activityFilter).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
                      {t('returns.k_217')}
                    </div>
                  ) : (
                    <div className="relative border-r-2 border-gray-200 dark:border-gray-700 mr-4 space-y-6">
                      {activityLog
                        .filter((l) => !activityFilter || l.action === activityFilter)
                        .map((log) => {
                          const actionMeta = ACTION_CONFIG[log.action] || {
                            label: log.action,
                            icon: Info,
                            badgeClass: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
                            borderClass: "border-gray-400 dark:border-gray-600",
                            dotClass: "bg-gray-400 dark:bg-gray-500",
                          };
                          const ActionIcon = actionMeta.icon;
                          const isSystem = !log.user || !log.user.id;
                          const fullName = log.user
                            ? [log.user.firstName, log.user.lastName].filter(Boolean).join(" ") || log.user.email || "مستخدم"
                            : "النظام الآلي";
                          const initials = fullName
                            .split(" ")
                            .filter(Boolean)
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("");

                          return (
                            <div key={log.id} className="relative flex items-start gap-3 mr-[-9px]">
                              {/* Timeline Dot */}
                              <div className="bg-white dark:bg-gray-800 p-1 rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-xs shrink-0 mt-0.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${actionMeta.dotClass}`} />
                              </div>

                              {/* Card Surface */}
                              <div className="flex-1 bg-gray-50/70 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-3">
                                {/* Header: Action Badge + Timestamp */}
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${actionMeta.badgeClass}`}>
                                    <ActionIcon size={14} />
                                    {actionMeta.label}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 tabular-nums">
                                    <Calendar size={12} />
                                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                                  </span>
                                </div>

                                {/* Who did it (الفاعل) */}
                                <div className="flex items-center gap-2.5 pt-0.5">
                                  {isSystem ? (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200 dark:border-blue-800/40">
                                      <Bot size={16} />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                                      {initials || <User size={14} />}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                      {fullName}
                                    </span>
                                    {log.user?.role && renderRoleBadge(log.user.role)}
                                    {isSystem && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
                                        تلقائي
                                      </span>
                                    )}
                                    {log.user?.email && (
                                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline" dir="ltr">
                                        ({log.user.email})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* What was done (تفاصيل الإجراء) */}
                                {renderActivityDetails(log)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('returns.k_220')}
          </button>
          {activeTab === "details" && (
            <button
              onClick={handleSaveReview}
              disabled={submittingReview}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md text-sm font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {submittingReview ? t('returns.k_105') : t('returns.k_134')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnDetailsModal;
