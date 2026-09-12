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
import { X, Phone, MessageCircle, Shield, Calendar, Truck } from 'lucide-react';
import { toast } from "sonner";

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
                <p className="text-center text-gray-500 dark:text-gray-400">
                  {t('returns.k_144')}
                </p>
              ) : (
                <>
                  <div className="flex gap-2 flex-wrap border-b border-gray-100 dark:border-gray-700 pb-3">
                    <button
                      onClick={() => setActivityFilter("")}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activityFilter === ""
                          ? "bg-blue-600 dark:bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t('returns.k_13')}
                    </button>
                    {Array.from(new Set(activityLog.map((l) => l.action))).map((action) => (
                      <button
                        key={action}
                        onClick={() => setActivityFilter(action)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activityFilter === action
                            ? "bg-blue-600 dark:bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                  {activityLog.filter((l) => !activityFilter || l.action === activityFilter).length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      {t('returns.k_217')}
                    </p>
                  ) : (
                    <div className="relative border-r-2 border-gray-200 dark:border-gray-700 mr-4 space-y-8">
                      {activityLog
                        .filter((l) => !activityFilter || l.action === activityFilter)
                        .map((log) => (
                    <div
                      key={log.id}
                      className="relative flex items-start gap-4 mr-[-9px]"
                    >
                      <div className="bg-white dark:bg-gray-800 p-1 rounded-full border-2 border-blue-500 dark:border-blue-400">
                        <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(log.createdAt).toLocaleString("ar-EG")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {t('returns.k_218')} <strong>{log.user?.firstName || t('returns.k_133')}</strong>{" "}
                          {t('returns.k_219')}
                        </p>
                        {log.details && (
                          <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono text-gray-500 dark:text-gray-400 overflow-x-auto">
                            {typeof log.details === "string"
                              ? log.details
                              : JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
