import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  returnService,
  ReturnType,
  ReturnTypeCode,
  ReturnTypeCostModel,
  ReturnShippingCompany,
} from '../../../services/returnService';

export const useReturnSettingsTypes = (activeTab: string) => {
  const { t } = useTranslation();

  const [shippingCompanies, setShippingCompanies] = useState<ReturnShippingCompany[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ReturnType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeShippingCompanyId, setTypeShippingCompanyId] = useState('');
  const [typeCode, setTypeCode] = useState<ReturnTypeCode>('SENDER_PAYS');
  const [typeCostModel, setTypeCostModel] = useState<ReturnTypeCostModel>('FULL');
  const [typeFixedAmount, setTypeFixedAmount] = useState('');
  const [savingType, setSavingType] = useState(false);

  const fetchTypes = async () => {
    setTypesLoading(true);
    try {
      const res = await returnService.getReturnShippingCompanies();
      setShippingCompanies(res.data.data);
    } catch (error) {
      console.error('Failed to load return types:', error);
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'types') {
      fetchTypes();
    }
  }, [activeTab]);

  const openTypeModal = (type?: ReturnType, presetCompanyId?: string) => {
    setEditingType(type || null);
    setTypeName(type?.name || '');
    setTypeShippingCompanyId(type?.shippingCompanyId || presetCompanyId || '');
    setTypeCode(type?.code || 'SENDER_PAYS');
    setTypeCostModel(type?.costModel || 'FULL');
    setTypeFixedAmount(type?.fixedAmount != null ? String(type.fixedAmount) : '');
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeShippingCompanyId) {
      toast.error(t('returns.k_257'));
      return;
    }
    setSavingType(true);
    try {
      const fixedAmount =
        typeCostModel === 'FIXED' && typeFixedAmount !== ''
          ? parseFloat(typeFixedAmount)
          : null;
      if (editingType) {
        await returnService.updateReturnType(editingType.id, {
          name: typeName,
          code: typeCode,
          costModel: typeCostModel,
          shippingCompanyId: typeShippingCompanyId,
          fixedAmount,
        });
      } else {
        await returnService.createReturnType({
          name: typeName,
          code: typeCode,
          costModel: typeCostModel,
          shippingCompanyId: typeShippingCompanyId,
          fixedAmount: fixedAmount ?? undefined,
        });
      }
      toast.success(t('returns.k_248'));
      setIsTypeModalOpen(false);
      fetchTypes();
    } catch (error) {
      const serverMsg = (error as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      if (serverMsg) {
        toast.error(serverMsg);
      } else {
        toast.error(t('returns.k_249'));
      }
    } finally {
      setSavingType(false);
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm(t('returns.k_252'))) return;
    try {
      await returnService.deleteReturnType(id);
      toast.success(t('returns.k_250'));
      fetchTypes();
    } catch (error) {
      toast.error(t('returns.k_251'));
    }
  };

  return {
    shippingCompanies,
    typesLoading,
    isTypeModalOpen,
    setIsTypeModalOpen,
    editingType,
    typeName,
    setTypeName,
    typeShippingCompanyId,
    setTypeShippingCompanyId,
    typeCode,
    setTypeCode,
    typeCostModel,
    setTypeCostModel,
    typeFixedAmount,
    setTypeFixedAmount,
    savingType,
    fetchTypes,
    openTypeModal,
    handleSaveType,
    deleteType,
  };
};
