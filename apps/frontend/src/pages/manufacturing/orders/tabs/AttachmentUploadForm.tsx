import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, RotateCw, X } from 'lucide-react';
import apiClient from '../../../../services/api';
import {
  AttachmentKind,
  ProductionStage,
  manufacturingApi,
} from '../../manufacturingApi';

interface AttachmentUploadFormProps {
  orderId: string;
  stages: ProductionStage[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const AttachmentUploadForm: React.FC<AttachmentUploadFormProps> = ({
  orderId,
  stages,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directUrl, setDirectUrl] = useState<string>('');
  const [selectedKind, setSelectedKind] = useState<AttachmentKind>('IMAGE');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDirectUrl('');

      // Auto-detect kind
      const mime = file.type;
      if (mime.startsWith('image/')) {
        setSelectedKind('IMAGE');
      } else if (mime.startsWith('video/')) {
        setSelectedKind('VIDEO');
      } else {
        setSelectedKind('DOC');
      }

      if (!caption) {
        setCaption(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !directUrl.trim()) {
      setUploadError('يرجى اختيار ملف أو إدخال رابط');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      let finalUrl = directUrl.trim();

      if (selectedFile) {
        const formData = new FormData();
        if (selectedKind === 'IMAGE') {
          formData.append('image', selectedFile);
          try {
            const res = await apiClient.post('/upload/single', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            finalUrl = res.data?.data?.url || res.data?.url || '';
          } catch {
            const fbData = new FormData();
            fbData.append('file', selectedFile);
            const res = await apiClient.post('/upload/service-file', fbData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            finalUrl = res.data?.data?.url || res.data?.filePath || '';
          }
        } else {
          formData.append('file', selectedFile);
          const res = await apiClient.post('/upload/service-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          finalUrl = res.data?.data?.url || res.data?.filePath || '';
        }

        if (!finalUrl) {
          throw new Error('لم يتم استلام رابط الملف من خادم الرفع');
        }
      }

      await manufacturingApi.createAttachment({
        url: finalUrl,
        kind: selectedKind,
        orderId,
        stageId: selectedStageId || undefined,
        caption: caption.trim() || undefined,
      });

      setSelectedFile(null);
      setDirectUrl('');
      setCaption('');
      setSelectedStageId('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await onSuccess();
      onClose();
    } catch (err: any) {
      setUploadError(
        err?.response?.data?.message || err?.message || 'فشل رفع وحفظ المرفق'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleUploadSubmit}
      className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3.5 animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <UploadCloud className="w-4 h-4 text-primary" />
          <span>رفع وتوثيق مرفق جديد</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:bg-muted"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {uploadError && (
        <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* File Input */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            اختر ملف من جهازك
          </label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*,.pdf,.doc,.docx,.xlsx"
            className="w-full text-xs text-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            يدعم الصور (PNG, JPG, WebP)، الفيديوهات (MP4)، والمستندات (PDF, Word).
          </p>
        </div>

        {/* Direct URL input fallback */}
        <div>
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            أو رابط مباشر
          </label>
          <input
            type="text"
            placeholder="https://... أو /uploads/..."
            value={directUrl}
            onChange={(e) => {
              setDirectUrl(e.target.value);
              setSelectedFile(null);
            }}
            className="w-full p-2 text-xs rounded border border-border bg-background"
          />
        </div>

        {/* Kind Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            نوع المرفق
          </label>
          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value as AttachmentKind)}
            className="w-full p-2 text-xs rounded border border-border bg-background"
          >
            <option value="IMAGE">صورة (IMAGE)</option>
            <option value="VIDEO">فيديو (VIDEO)</option>
            <option value="DOC">مستند / ملف (DOC)</option>
          </select>
        </div>

        {/* Stage Association */}
        <div>
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            ربط بمرحلة تشغيل (اختياري)
          </label>
          <select
            value={selectedStageId}
            onChange={(e) => setSelectedStageId(e.target.value)}
            className="w-full p-2 text-xs rounded border border-border bg-background"
          >
            <option value="">عام لكامل أمر الإنتاج</option>
            {stages.map((st) => (
              <option key={st.id} value={st.id}>
                مرحلة #{st.sequence}: {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            وصف المرفق (Caption)
          </label>
          <input
            type="text"
            placeholder="مثال: فحص عينة التطريز النهائية"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-2 text-xs rounded border border-border bg-background"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          className="px-3 py-1.5 rounded border border-border text-muted-foreground hover:bg-muted"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={uploading || (!selectedFile && !directUrl.trim())}
          className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/95 disabled:opacity-40 flex items-center gap-2"
        >
          {uploading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
          <span>رفع وحفظ المرفق</span>
        </button>
      </div>
    </form>
  );
};
