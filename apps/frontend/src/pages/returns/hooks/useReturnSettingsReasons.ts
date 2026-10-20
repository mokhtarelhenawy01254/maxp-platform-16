import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  returnService,
  ReturnReason,
  ReturnReasonCategory,
} from '../../../services/returnService';
import { getDefaultData } from '../components/returnSettingsConstants';

export const useReturnSettingsReasons = () => {
  const { t } = useTranslation();
  const DEFAULT_DATA = useMemo(() => getDefaultData(t), [t]);

  const [categories, setCategories] = useState<ReturnReasonCategory[]>([]);
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ReturnReasonCategory | null>(null);
  const [editingReason, setEditingReason] = useState<ReturnReason | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [defaultRole, setDefaultRole] = useState<'CUSTOMER' | 'STORE' | 'SHIPPING' | 'OTHER'>('OTHER');

  const [reasonText, setReasonText] = useState('');
  const [reasonDesc, setReasonDesc] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const fetchReasonsData = async () => {
    setLoading(true);
    try {
      const [catRes, resRes] = await Promise.all([
        returnService.getCategories(),
        returnService.getReasons(),
      ]);
      setCategories(catRes.data);
      setReasons(resRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReasonsData();
  }, []);

  const addDefaults = async () => {
    if (!confirm(t('returns.k_94'))) return;
    setLoading(true);
    try {
      for (const catData of DEFAULT_DATA) {
        const catRes = await returnService.createCategory({
          name: catData.name,
          defaultRole: catData.defaultRole as any,
        });
        const catId = catRes.data.id;
        for (const reasonData of catData.reasons) {
          await returnService.createReason({
            reason: reasonData.reason,
            description: reasonData.description,
            categoryId: catId,
          });
        }
      }
      toast.success(t('returns.k_95'));
      fetchReasonsData();
    } catch (error) {
      console.error(error);
      toast.error(t('returns.k_96'));
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await returnService.updateCategory(editingCategory.id, {
          name: categoryName,
          defaultRole,
        });
        toast.success(t('returns.k_97'));
      } else {
        await returnService.createCategory({ name: categoryName, defaultRole });
        toast.success(t('returns.k_98'));
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName('');
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_99'));
    }
  };

  const handleSaveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReason) {
        await returnService.updateReason(editingReason.id, {
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('returns.k_100'));
      } else {
        await returnService.createReason({
          reason: reasonText,
          description: reasonDesc,
          categoryId: selectedCategoryId,
        });
        toast.success(t('returns.k_101'));
      }
      setIsReasonModalOpen(false);
      setEditingReason(null);
      setReasonText('');
      setReasonDesc('');
      setSelectedCategoryId('');
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_99'));
    }
  };

  const deleteReason = async (id: string) => {
    if (!confirm(t('returns.k_102'))) return;
    try {
      await returnService.deleteReason(id);
      toast.success(t('returns.k_103'));
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_104'));
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(t('returns.k_261'))) return;
    try {
      await returnService.deleteCategory(id);
      toast.success(t('returns.k_262'));
      fetchReasonsData();
    } catch (error) {
      toast.error(t('returns.k_263'));
    }
  };

  return {
    categories,
    reasons,
    loading,
    addDefaults,
    deleteCategory,
    deleteReason,
    fetchReasonsData,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    editingCategory,
    setEditingCategory,
    categoryName,
    setCategoryName,
    defaultRole,
    setDefaultRole,
    handleSaveCategory,
    isReasonModalOpen,
    setIsReasonModalOpen,
    editingReason,
    setEditingReason,
    reasonText,
    setReasonText,
    reasonDesc,
    setReasonDesc,
    selectedCategoryId,
    setSelectedCategoryId,
    handleSaveReason,
  };
};
