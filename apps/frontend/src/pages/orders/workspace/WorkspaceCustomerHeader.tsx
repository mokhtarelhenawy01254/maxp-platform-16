import React from 'react';
import { PencilSquareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export interface WorkspaceCustomerHeaderProps {
  customerName: string;
  customerPhone?: string;
  secondaryPhone?: string;
  isArabic: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
}

export const WorkspaceCustomerHeader: React.FC<WorkspaceCustomerHeaderProps> = ({
  customerName,
  customerPhone,
  secondaryPhone,
  isArabic,
  canEdit,
  onStartEdit,
}) => {
  const handleCopyPhone = () => {
    if (!customerPhone) return;
    navigator.clipboard?.writeText(customerPhone).then(
      () => toast.success(isArabic ? 'تم نسخ الرقم' : 'Number copied'),
      () => toast.error(isArabic ? 'تعذر النسخ' : 'Copy failed'),
    );
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-bold text-foreground truncate">
          {customerName || (isArabic ? 'عميل بدون اسم' : 'Unnamed Customer')}
        </h3>
        {canEdit && (
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded p-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            title={isArabic ? 'تعديل بيانات العميل' : 'Edit Customer'}
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground" dir="ltr">
        {customerPhone ? (
          <span className="inline-flex items-center gap-1">
            <a
              href={`tel:${customerPhone.replace(/\s/g, '')}`}
              className="font-semibold text-foreground hover:text-primary hover:underline"
              title={isArabic ? 'اتصال بالرقم من الجهاز الحالي' : 'Dial this number'}
            >
              {customerPhone}
            </a>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
              title={isArabic ? 'نسخ الرقم' : 'Copy number'}
              aria-label={isArabic ? 'نسخ رقم العميل' : 'Copy customer number'}
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span>{isArabic ? 'بدون هاتف' : 'No phone'}</span>
        )}

        {secondaryPhone && secondaryPhone !== customerPhone && (
          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
            <span className="text-[10px] text-muted-foreground">{isArabic ? 'بديل:' : 'Alt:'}</span>
            <a
              href={`tel:${secondaryPhone.replace(/\s/g, '')}`}
              className="hover:text-primary hover:underline"
              title={isArabic ? 'اتصال بالرقم البديل' : 'Dial alternate number'}
            >
              {secondaryPhone}
            </a>
          </span>
        )}
      </div>
    </div>
  );
};

export default WorkspaceCustomerHeader;
