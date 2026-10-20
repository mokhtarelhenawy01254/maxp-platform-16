import React from 'react';
import { Factory } from 'lucide-react';

interface ManufacturingHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const ManufacturingHeader: React.FC<ManufacturingHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="border-b border-border/70 bg-card sticky top-0 z-20">
      {/* Top Action Bar */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title || 'نظام إدارة عمليات وخطوط الإنتاج (MES)'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {subtitle || 'تتبع قوائم المكونات وأوامر التشغيل وتكلفة القطعة الفعلية والربط مع WIP'}
            </p>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default ManufacturingHeader;
