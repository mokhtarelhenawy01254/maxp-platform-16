import React from 'react';
import { X, FileText, ExternalLink } from 'lucide-react';
import { ManufacturingAttachment } from '../../manufacturingApi';

interface AttachmentPreviewModalProps {
  attachment: ManufacturingAttachment | null;
  onClose: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  onClose,
}) => {
  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[85vh] rounded-2xl bg-card border border-border/80 overflow-hidden shadow-2xl p-2 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-full bg-background/80 text-foreground hover:bg-background z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {attachment.kind === 'IMAGE' ? (
          <img
            src={attachment.url}
            alt={attachment.caption || 'معاينة'}
            className="max-h-[75vh] w-auto object-contain rounded-lg"
          />
        ) : attachment.kind === 'VIDEO' ? (
          <video
            src={attachment.url}
            controls
            autoPlay
            className="max-h-[75vh] w-full rounded-lg"
          />
        ) : (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-16 h-16 text-amber-500 mx-auto" />
            <h4 className="font-bold text-foreground text-base">
              {attachment.caption || 'مستند مرفق'}
            </h4>
            <a
              href={attachment.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              <span>تنزيل / فتح الملف</span>
            </a>
          </div>
        )}

        {attachment.caption && (
          <p className="text-center text-xs text-muted-foreground mt-2 px-4">
            {attachment.caption}
          </p>
        )}
      </div>
    </div>
  );
};
