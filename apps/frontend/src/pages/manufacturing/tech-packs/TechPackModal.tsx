import React, { useState, useEffect } from 'react';
import { X, BookOpen, Upload, Trash2, FileText, Image as ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { manufacturingApi, TechPack, TechPackFile, ProductOption } from '../manufacturingApi';

interface TechPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated?: TechPack) => void;
  initialTechPack?: TechPack | null;
  mode?: 'create' | 'edit' | 'clone';
}

export const TechPackModal: React.FC<TechPackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTechPack,
  mode = 'create',
}) => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [brand, setBrand] = useState('HUINZO');
  const [fabricSummary, setFabricSummary] = useState('');
  const [printDetails, setPrintDetails] = useState('');
  const [labelDetails, setLabelDetails] = useState('');
  const [packagingDetails, setPackagingDetails] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  // Files State
  const [files, setFiles] = useState<TechPackFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileInputUrl, setFileInputUrl] = useState('');
  const [fileInputName, setFileInputName] = useState('');
  const [fileInputKind, setFileInputKind] = useState<'IMAGE' | 'PDF' | 'OTHER'>('IMAGE');

  useEffect(() => {
    manufacturingApi.getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialTechPack && isOpen) {
      setCode(mode === 'clone' ? `${initialTechPack.code}-V2` : initialTechPack.code);
      setName(mode === 'clone' ? `${initialTechPack.name} (نسخة)` : initialTechPack.name);
      setProductId(initialTechPack.productId || '');
      setBrand(initialTechPack.brand || 'HUINZO');
      setFabricSummary(initialTechPack.fabricSummary || '');
      setPrintDetails(initialTechPack.printDetails || '');
      setLabelDetails(initialTechPack.labelDetails || '');
      setPackagingDetails(initialTechPack.packagingDetails || '');
      setInstructions(initialTechPack.instructions || '');
      setNotes(initialTechPack.notes || '');
      setFiles(initialTechPack.files || []);
    } else if (isOpen) {
      setCode(`TP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
      setName('هودي كاجوال أوفر سايز — شتوي');
      setProductId('');
      setBrand('HUINZO');
      setFabricSummary('ميلتون قطن 100% مبطن - وزن 340 GSM - عرض 185 سم');
      setPrintDetails('طباعة سلك سكرين حراري على الصدر بارتفاع 8 سم + تطريز شعار على الكتف');
      setLabelDetails('تكت رقبة منسوج ساتان مقاس 4×6 سم + تكت غسيل داخلي جانبي');
      setPackagingDetails('كيس بولي إيثيلين شفاف مع باركود لاصق + كرتون مقوى 25 قطعة');
      setInstructions('غسيل على البارد 30 درجة - كي مقلوب - عدم استخدام الكلور');
      setNotes('');
      setFiles([
        {
          id: `file_${Date.now()}`,
          techPackId: '',
          fileName: 'tech_drawing_v1.png',
          url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
          kind: 'IMAGE',
          uploadedAt: new Date().toISOString(),
        },
      ]);
    }
  }, [initialTechPack, isOpen, mode]);

  if (!isOpen) return null;

  const isApproved = initialTechPack?.status === 'APPROVED' && mode === 'edit';

  const handleAddUrlFile = () => {
    if (!fileInputUrl.trim()) return;
    const newFile: TechPackFile = {
      id: `file_${Date.now()}`,
      techPackId: initialTechPack?.id || '',
      fileName: fileInputName.trim() || 'ملف فني',
      url: fileInputUrl.trim(),
      kind: fileInputKind,
      uploadedAt: new Date().toISOString(),
    };
    setFiles([...files, newFile]);
    setFileInputUrl('');
    setFileInputName('');
  };

  const handleNativeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (initialTechPack?.id && mode === 'edit') {
      try {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', file);
        const res = await manufacturingApi.uploadTechPackFile(initialTechPack.id, formData);
        setFiles([...files, res.file]);
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'فشل رفع الملف');
      } finally {
        setUploadingFile(false);
      }
    } else {
      // Local preview file for create mode
      const localUrl = URL.createObjectURL(file);
      const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');
      const newFile: TechPackFile = {
        id: `file_${Date.now()}`,
        techPackId: '',
        fileName: file.name,
        url: localUrl,
        kind: isPdf ? 'PDF' : 'IMAGE',
        uploadedAt: new Date().toISOString(),
      };
      setFiles([...files, newFile]);
    }
  };

  const handleRemoveFile = async (idx: number, file: TechPackFile) => {
    if (initialTechPack?.id && file.id && !file.id.startsWith('file_') && mode === 'edit' && !isApproved) {
      try {
        await manufacturingApi.deleteTechPackFile(initialTechPack.id, file.id);
      } catch (err: any) {
        alert(err.response?.data?.message || err.message || 'فشل حذف الملف');
        return;
      }
    }
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('اسم الموديل أو الملف الفني مطلوب');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        productId: productId || null,
        brand: brand.trim() || null,
        fabricSummary: fabricSummary.trim() || null,
        printDetails: printDetails.trim() || null,
        labelDetails: labelDetails.trim() || null,
        packagingDetails: packagingDetails.trim() || null,
        instructions: instructions.trim() || null,
        notes: notes.trim() || null,
        files: files.map((f) => ({ fileName: f.fileName, url: f.url, kind: f.kind })),
      };

      let resultTechPack: TechPack | undefined;
      if (mode === 'edit' && initialTechPack) {
        const res = await manufacturingApi.updateTechPack(initialTechPack.id, payload);
        resultTechPack = res.techPack;
      } else {
        resultTechPack = await manufacturingApi.createTechPack(payload);
      }

      onClose();
      onSuccess(resultTechPack);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل حفظ الملف الفني');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {mode === 'edit'
                  ? 'تعديل ملف المنتج الفني (Tech Pack)'
                  : mode === 'clone'
                  ? 'استنساخ إصدار جديد من الملف الفني'
                  : 'إنشاء ملف فني جديد للمنتج (Tech Pack)'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                المواصفات الهندسية، تركيب الخامات، تفاصيل الطباعة والتطريز، والتعبئة لخطوط الإنتاج
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {isApproved && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>تنبيه إصدار معتمد:</strong> هذا الملف الفني معتمد حالياً. حفظ أي تعديل هنا لن يمس النسخة المعتمدة، بل سينشئ تلقائياً <strong>نسخة مسودة جديدة برقم إصدار تالٍ (V{(initialTechPack?.version || 1) + 1})</strong>.
              </div>
            </div>
          )}

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">كود الملف الفني</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="TP-YYYY-XXXXX"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">اسم الموديل / المنتج الفني *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سويت شيرت شتوي قطن أوفر سايز"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">العلامة التجارية / الماركة</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="HUINZO"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
          </div>

          {/* Product link */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ربط بمنتج من الكتالوج (اختياري)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
            >
              <option value="">-- بدون ربط بمنتج محدد --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku ? `(${p.sku})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fabric Specification Summary (Mandatory for approval) */}
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <label className="block text-[11px] font-bold text-primary">
              ملخص مواصفات الخامة والتركيب (شرط إلزامي للاعتماد) *
            </label>
            <textarea
              rows={2}
              value={fabricSummary}
              onChange={(e) => setFabricSummary(e.target.value)}
              placeholder="مثال: قطن 100% ميلتون مهيّر - وزن 320 GSM - عرض القماش 185 سم - معالجة ضد الانكماش"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Secondary Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">تفاصيل الطباعة والتطريز</label>
              <textarea
                rows={2}
                value={printDetails}
                onChange={(e) => setPrintDetails(e.target.value)}
                placeholder="موضع الطباعة، أبعاد الرسمة، نوع الحبر..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">بيانات التكت والبادجات (Labels & Trims)</label>
              <textarea
                rows={2}
                value={labelDetails}
                onChange={(e) => setLabelDetails(e.target.value)}
                placeholder="تكت الرقبة، تكت الغسيل، الهانج تاج..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مواصفات التعبئة والتغليف (Packaging)</label>
              <textarea
                rows={2}
                value={packagingDetails}
                onChange={(e) => setPackagingDetails(e.target.value)}
                placeholder="طريقة التطبيق، نوع الكيس، بيانات الكرتونة الخارجية..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">تعليمات التشغيل والغسيل</label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="درجة حرارة الكي، الغسيل، الحفظ..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
          </div>

          {/* File Attachments Section */}
          <div className="border border-border/70 rounded-xl p-3 bg-muted/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                الملفات والرسومات الفنية ({files.length})
                <span className="text-[10px] text-muted-foreground font-normal">(صورة أو PDF واحد على الأقل للاعتماد)</span>
              </span>
              <label className="cursor-pointer px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-2xs">
                {uploadingFile ? 'جارٍ الرفع...' : 'رفع ملف من الجهاز'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleNativeFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>
            </div>

            {/* Quick URL Adder */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50">
              <input
                type="text"
                value={fileInputName}
                onChange={(e) => setFileInputName(e.target.value)}
                placeholder="اسم الملف / الرسمة"
                className="sm:col-span-1 px-2 py-1 text-xs rounded-md border border-border bg-background"
              />
              <input
                type="text"
                value={fileInputUrl}
                onChange={(e) => setFileInputUrl(e.target.value)}
                placeholder="رابط الملف (URL)..."
                className="sm:col-span-2 px-2 py-1 text-xs rounded-md border border-border bg-background"
              />
              <button
                type="button"
                onClick={handleAddUrlFile}
                className="px-2 py-1 rounded-md text-xs font-medium border border-border/70 hover:bg-muted transition"
              >
                + إضافة برابط
              </button>
            </div>

            {/* Files List */}
            {files.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">لا توجد ملفات مرفقة حتى الآن.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {files.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="p-2 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {file.kind === 'PDF' ? (
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[11px] text-foreground hover:text-primary hover:underline"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx, file)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي اشتراطات خاصة بالعميل..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/10 -mx-5 -mb-5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-muted transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ...' : mode === 'edit' ? (isApproved ? 'حفظ وإنشاء إصدار جديد' : 'حفظ التعديلات') : 'إنشاء الملف الفني'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
