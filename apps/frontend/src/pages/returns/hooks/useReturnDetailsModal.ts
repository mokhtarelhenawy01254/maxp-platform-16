import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ReturnRequest,
  returnService,
  ContactAttempt,
  ActivityLog,
  ReturnType,
  ReturnShippingCompany,
} from '../../../services/returnService';

export const useReturnDetailsModal = (
  request: ReturnRequest,
  onUpdate: () => void
) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'details' | 'contact' | 'activity'>('details');
  const [contactHistory, setContactHistory] = useState<ContactAttempt[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Contact Form
  const [contactMethod, setContactMethod] = useState('PHONE');
  const [contactResult, setContactResult] = useState('NO_ANSWER');
  const [contactNotes, setContactNotes] = useState('');

  // Review Form
  const [reasonId, setReasonId] = useState(request.reasonId || '');
  const [customerNotes, setCustomerNotes] = useState(request.customerNotes || '');
  const [responsibleParty, setResponsibleParty] = useState(request.responsibleParty || '');
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || '');
  const [shippingReturnCost, setShippingReturnCost] = useState(
    request.shippingReturnCost !== undefined && request.shippingReturnCost !== null
      ? String(request.shippingReturnCost)
      : ''
  );
  const [settlementAmount, setSettlementAmount] = useState(
    request.settlementAmount !== undefined && request.settlementAmount !== null
      ? String(request.settlementAmount)
      : ''
  );
  const isReviewed = true;
  const [submittingReview, setSubmittingReview] = useState(false);

  // Return Type & Shipping Company
  const [shippingCompanies, setShippingCompanies] = useState<ReturnShippingCompany[]>([]);
  const [returnTypes, setReturnTypes] = useState<ReturnType[]>([]);
  const [shippingCompanyId, setShippingCompanyId] = useState(request.shippingCompanyId || '');
  const [returnTypeId, setReturnTypeId] = useState(request.returnTypeId || '');

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
  const [activityFilter, setActivityFilter] = useState<string>('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      if (activeTab === 'contact') {
        const res = await returnService.getContactHistory(request.id);
        setContactHistory(res.data);
      } else if (activeTab === 'activity') {
        const res = await returnService.getActivityLog(request.id);
        setActivityLog(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'details') {
      fetchLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    returnService.getCategories().then((res) => setCategories(res.data)).catch(() => {});
    returnService.getReasons().then((res) => setReasons(res.data)).catch(() => {});
  }, []);

  const getSuggestedCost = (type: ReturnType | undefined): number => {
    if (!type) return 0;
    if (type.costModel === 'FIXED' && type.fixedAmount != null) {
      const fixed = Number(type.fixedAmount);
      return isNaN(fixed) ? 0 : fixed;
    }
    if (type.costModel === 'NONE') {
      return 0;
    }
    if (type.costModel === 'FULL') {
      const o = request.order as any;
      const rawCost = o?.shippingCost ?? o?.shipping ?? 0;
      const parsed = Number(rawCost);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const applyReturnTypeCost = (type: ReturnType | undefined) => {
    if (!type) return;
    const cost = getSuggestedCost(type);
    setShippingReturnCost(String(cost));
  };

  useEffect(() => {
    returnService
      .getReturnShippingCompanies({ activeOnly: true })
      .then((res) => {
        const companies: ReturnShippingCompany[] = res.data?.data || [];
        const activeCompanies = companies.filter((c) => c.isActive !== false);
        setShippingCompanies(activeCompanies);

        let resolvedCompanyId = request.shippingCompanyId || '';
        if (!resolvedCompanyId) {
          if (activeCompanies.length === 1) {
            resolvedCompanyId = activeCompanies[0].id;
          } else if (
            request.order?.turboTrackingNumber ||
            (request.order as any)?.turboShipmentId
          ) {
            const turbo = activeCompanies.find(
              (c) =>
                c.slug?.toLowerCase() === 'turbo' ||
                c.providerKey?.toUpperCase() === 'TURBO' ||
                c.name?.toLowerCase().includes('turbo')
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
              request.shippingReturnCost === ('' as any))
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
          const allActiveTypes = activeCompanies
            .flatMap((c) => c.returnTypes || [])
            .filter((rt) => rt.isActive !== false);
          setReturnTypes(allActiveTypes);

          if (
            request.returnTypeId &&
            (request.shippingReturnCost === undefined ||
              request.shippingReturnCost === null ||
              request.shippingReturnCost === ('' as any))
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
    setReturnTypeId('');
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
      setShippingReturnCost('');
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
          shippingReturnCost === '' ? null : parseFloat(shippingReturnCost),
        settlementAmount:
          settlementAmount === '' ? null : parseFloat(settlementAmount),
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
      setContactMethod('PHONE');
      setContactResult('NO_ANSWER');
      setContactNotes('');
      fetchLogs();
    } catch (error) {
      toast.error(t('returns.k_122'));
    }
  };

  return {
    activeTab,
    setActiveTab,
    contactHistory,
    activityLog,
    loadingLogs,
    contactMethod,
    setContactMethod,
    contactResult,
    setContactResult,
    contactNotes,
    setContactNotes,
    reasonId,
    setReasonId,
    customerNotes,
    setCustomerNotes,
    responsibleParty,
    setResponsibleParty,
    adminNotes,
    setAdminNotes,
    shippingReturnCost,
    setShippingReturnCost,
    settlementAmount,
    setSettlementAmount,
    submittingReview,
    shippingCompanies,
    returnTypes,
    shippingCompanyId,
    returnTypeId,
    categories,
    reasons,
    responsiblePartyOptions,
    activityFilter,
    setActivityFilter,
    handleShippingCompanyChange,
    handleReturnTypeChange,
    getSuggestedCost,
    handleSaveReview,
    handleAddContact,
  };
};
