import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import courierService, {
  Courier,
  CourierDashboardSummary,
  CourierInput,
} from '../../../../services/courierService';

export const useCourierManagementData = () => {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [summary, setSummary] = useState<CourierDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [saving, setSaving] = useState(false);
  const [fleetSettings, setFleetSettings] = useState<any>(null);
  const [formData, setFormData] = useState<CourierInput>({
    name: '',
    phone: '',
    nationalId: '',
    vehicleType: 'MOTORCYCLE',
    plateNumber: '',
    governorates: '',
    commissionType: 'FIXED_PER_ORDER',
    commissionAmount: 0,
    isActive: true,
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [couriersRes, summaryRes, settings] = await Promise.all([
        courierService.getCouriers({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        courierService.getSummary(),
        courierService.getFleetSettings(),
      ]);

      if (couriersRes.success) setCouriers(couriersRes.data || []);
      if (summaryRes.success) setSummary(summaryRes.data || null);
      if (settings) setFleetSettings(settings);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل بيانات المناديب');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingCourier(null);
    const defaultType = fleetSettings?.commission?.defaultType;
    const mappedType =
      defaultType === 'PERCENTAGE'
        ? 'PERCENTAGE'
        : defaultType === 'FIXED_SALARY'
        ? 'FIXED_SALARY'
        : 'FIXED_PER_ORDER';
    const defaultAmount = Number(fleetSettings?.commission?.defaultValue ?? 30);

    setFormData({
      name: '',
      phone: '',
      nationalId: '',
      vehicleType: 'MOTORCYCLE',
      plateNumber: '',
      governorates: '',
      commissionType: mappedType,
      commissionAmount: defaultAmount,
      isActive: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Courier) => {
    setEditingCourier(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      nationalId: c.nationalId || '',
      vehicleType: c.vehicleType,
      plateNumber: c.plateNumber || '',
      governorates: c.governorates || '',
      commissionType: c.commissionType,
      commissionAmount: c.commissionAmount,
      isActive: c.isActive,
      notes: c.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('الاسم ورقم الهاتف حقول مطلوبة');
      return;
    }

    setSaving(true);
    try {
      if (editingCourier) {
        await courierService.updateCourier(editingCourier.id, formData);
        toast.success('تم تحديث بيانات المندوب بنجاح');
      } else {
        await courierService.createCourier(formData);
        toast.success('تمت إضافة المندوب بنجاح');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ بيانات المندوب');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف أو تعطيل المندوب "${name}"؟`)) return;
    try {
      await courierService.deleteCourier(id);
      toast.success('تم حذف/تعطيل المندوب');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إتمام العملية');
    }
  };

  return {
    couriers,
    summary,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isModalOpen,
    setIsModalOpen,
    editingCourier,
    saving,
    formData,
    setFormData,
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    handleDelete,
  };
};
