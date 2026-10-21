import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  cancellationService,
  type CancellationReason,
  type CancellationReasonCategory,
} from '../../../services/cancellationService';

const getDefaultData = (t: (key: string) => string) => [
  {
    name: t('cancellations.k_1'),
    reasons: [
      { reason: t('cancellations.k_2'), description: t('cancellations.k_3') },
      { reason: t('cancellations.k_4'), description: t('cancellations.k_5') },
      { reason: t('cancellations.k_6'), description: t('cancellations.k_7') },
    ],
  },
  {
    name: t('cancellations.k_8'),
    reasons: [
      { reason: t('cancellations.k_9'), description: t('cancellations.k_10') },
      { reason: t('cancellations.k_11'), description: t('cancellations.k_12') },
    ],
  },
  {
    name: t('cancellations.k_13'),
    reasons: [
      { reason: t('cancellations.k_14'), description: t('cancellations.k_15') },
      { reason: t('cancellations.k_16'), description: t('cancellations.k_17') },
    ],
  },
];

export const useCancellationSettingsController = () => {
  const { t } = useTranslation();
  const defaultData = useMemo(() => getDefaultData(t), [t]);

  const [categories, setCategories] = useState<CancellationReasonCategory[]>([]);
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CancellationReasonCategory | null>(null);
  const [editingReason, setEditingReason] = useState<CancellationReason | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [reasonDesc, setReasonDesc] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, resRes] = await Promise.all([
        cancellationService.getCategories(),
        cancellationService.getReasons(),
      ]);
      setCategories(catRes.data);
      setReasons(resRes.data);
    } catch {
      toast.error(t('cancellations.k_18'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addDefaults = async () => {
    if (!confirm(t('cancellations.k_19'))) return;
    setLoading(true);
    try {
      for (const catData of defaultData) {
        const catRes = await cancellationService.createCategory({ name: catData.name });
        const catId = catRes.data.id;
        for (const reasonData of catData.reasons) {
          await cancellationService.createReason({
            reason: reasonData.reason,
            description: reasonData.description,
            categoryId: catId,
          });
        }
      }
      toast.success(t('cancellations.k_20'));
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(t('cancellations.k_21'));
      setLoading(false);
    }
  };

  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CancellationReasonCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await cancellationService.updateCategory(editingCategory.id, { name: categoryName });
        toast.success(t('cancellations.k_22'));
      } else {
        await cancellationService.createCategory({ name: categoryName });
        toast.success(t('cancellations.k_23'));
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName('');
      fetchData();
    } catch {
      toast.error(t('cancellations.k_24'));
    }
  };

  const openNewReasonModal = () => {
    setEditingReason(null);
    setReasonText('');
    setReasonDesc('');
    setSelectedCategoryId(categories[0]?.id || '');
    setIsReasonModalOpen(true);
  };

  const openEditReasonModal = (reason: CancellationReason) => {
    setEditingReason(reason);
    setReasonText(reason.reason);
    setReasonDesc(reason.description || '');
    setSelectedCategoryId(reason.categoryId || '');
    setIsReasonModalOpen(true);
  };

  const handleSaveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReason) {
        await cancellationService.updateReason(editingReason.id, {
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('cancellations.k_25'));
      } else {
        await cancellationService.createReason({
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('cancellations.k_26'));
      }
      setIsReasonModalOpen(false);
      setEditingReason(null);
      setReasonText('');
      setReasonDesc('');
      setSelectedCategoryId('');
      fetchData();
    } catch {
      toast.error(t('cancellations.k_24'));
    }
  };

  const deleteReason = async (id: string) => {
    if (!confirm(t('cancellations.k_27'))) return;
    try {
      await cancellationService.deleteReason(id);
      toast.success(t('cancellations.k_28'));
      fetchData();
    } catch {
      toast.error(t('cancellations.k_29'));
    }
  };

  return {
    t,
    categories,
    reasons,
    loading,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    isReasonModalOpen,
    setIsReasonModalOpen,
    editingCategory,
    editingReason,
    categoryName,
    setCategoryName,
    reasonText,
    setReasonText,
    reasonDesc,
    setReasonDesc,
    selectedCategoryId,
    setSelectedCategoryId,
    addDefaults,
    openNewCategoryModal,
    openEditCategoryModal,
    handleSaveCategory,
    openNewReasonModal,
    openEditReasonModal,
    handleSaveReason,
    deleteReason,
  };
};
