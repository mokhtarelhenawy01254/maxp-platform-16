import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  type ReturnRequest,
  returnService,
  type ContactAttempt,
  type ActivityLog,
} from '../../../services/returnService';
import { useReturnShippingSelection } from './useReturnShippingSelection';

export interface ReturnDropdownCategory {
  id: string;
  name: string;
  defaultRole?: string;
}

export interface ReturnDropdownReason {
  id: string;
  reason: string;
  categoryId?: string;
  description?: string;
}

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

  // Shipping & Return Type sub-hook
  const {
    shippingCompanies,
    returnTypes,
    shippingCompanyId,
    returnTypeId,
    getSuggestedCost,
    handleShippingCompanyChange,
    handleReturnTypeChange,
  } = useReturnShippingSelection(request, setShippingReturnCost);

  // Categories & Reasons for dropdown
  const [categories, setCategories] = useState<ReturnDropdownCategory[]>([]);
  const [reasons, setReasons] = useState<ReturnDropdownReason[]>([]);

  const responsiblePartyOptions = categories.reduce<Array<{ value: string; label: string }>>((acc, cat) => {
    if (cat.defaultRole && !acc.find((a) => a.value === cat.defaultRole)) {
      acc.push({ value: cat.defaultRole, label: cat.name });
    }
    return acc;
  }, []);

  // Activity Log Filter
  const [activityFilter, setActivityFilter] = useState<string>('');

  const fetchLogs = useCallback(async () => {
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
  }, [activeTab, request.id]);

  useEffect(() => {
    if (activeTab !== 'details') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    returnService.getCategories().then((res) => setCategories(res.data)).catch(() => {});
    returnService.getReasons().then((res) => setReasons(res.data)).catch(() => {});
  }, []);

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
    } catch {
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
    } catch {
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
