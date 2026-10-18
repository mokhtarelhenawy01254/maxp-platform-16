import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle, X, RotateCw } from 'lucide-react';
import { manufacturingApi, PartnerFactory } from '../manufacturingApi';

interface PartnerFactoryModalProps {
  isOpen: boolean;
  editingFactory: PartnerFactory | null;
  specialties: string[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const PartnerFactoryModal: React.FC<PartnerFactoryModalProps> = ({
  isOpen,
  editingFactory,
  specialties,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    specialty: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (editingFactory) {
      setFormData({
        name: editingFactory.name || '',
        code: editingFactory.code || '',
        specialty: editingFactory.specialty || '',
        contactPerson: editingFactory.contactPerson || '',
        phone: editingFactory.phone || '',
        email: editingFactory.email || '',
        address: editingFactory.address || '',
        notes: editingFactory.notes || '',
        isActive: editingFactory.isActive,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        specialty: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        isActive: true,
      });
    }
    setModalError(null);
  }, [editingFactory, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('يرجى إدخال اسم المصنع الشريك');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      if (editingFactory) {
        await manufacturingApi.updatePartnerFactory(editingFactory.id, formData);
      } else {
        await manufacturingApi.createPartnerFactory(formData);
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ بيانات المصنع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                {editingFactory ? 'تعديل بيانات المصنع الشريك' : 'إضافة مصنع شريك جديد'}
              </h3>
              <p className="text-xs text-muted-foreground">
                سجل جهة التنفيذ الخارجية لتمكين إسناد مراحل التصنيع ومتابعة مواعيد الإنجاز
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          {modalError && (
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                اسم المصنع / الورشة <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: ورشة النور للتطريز"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                كود المصنع (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: FAC-001"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                التخصص الفني
              </label>
              <input
                type="text"
                list="specialties-list"
                placeholder="اختر أو اكتب التخصص"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <datalist id="specialties-list">
                {specialties.map((sp) => (
                  <option key={sp} value={sp} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                مسؤول التواصل
              </label>
              <input
                type="text"
                placeholder="اسم المسؤول"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dir-ltr text-right"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                العنوان والموقع الجغرافي
              </label>
              <input
                type="text"
                placeholder="المنطقة الصناعية، العنوان بالتفصيل..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                ملاحظات وتعليمات التعاقد
              </label>
              <textarea
                rows={2}
                placeholder="أي ملاحظات حول قدرة الإنتاج أو اشتراطات التسليم..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="factory-is-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/20"
              />
              <label
                htmlFor="factory-is-active"
                className="text-xs font-medium text-foreground cursor-pointer"
              >
                المصنع نشط ومتاح لإسناد المراحل حالياً
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted text-sm font-medium transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {submitting && <RotateCw className="w-4 h-4 animate-spin" />}
              <span>{editingFactory ? 'تحديث البيانات' : 'إنشاء المصنع الشريك'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
