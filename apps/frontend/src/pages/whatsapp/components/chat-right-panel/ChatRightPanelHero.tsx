import React from 'react';
import {
  Activity,
  ExternalLink,
  Plus,
  ShoppingBag,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInboxExternalImageUrl } from '@/utils/imageUrl';
import { getContactInitials } from '../../whatsappContactDisplay';
import type { Contact } from '../../../../hooks/useWhatsAppQueries';
import type { RightPanelTab } from './types';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'عميل محتمل', color: '#f59e0b' },
  ACTIVE: { label: 'عميل نشط', color: '#10b981' },
  VIP: { label: 'عميل مميز', color: '#8b5cf6' },
  BLOCKED: { label: 'محظور', color: '#ef4444' },
};

interface ChatRightPanelHeroProps {
  contact: Contact;
  contactName: string;
  isGroup: boolean;
  isLinkedCustomer: boolean;
  ordersCount: number;
  ltv: number;
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  onOpenOrder: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks: () => void;
  onOpenLabels?: () => void;
  onClose?: () => void;
}

export const ChatRightPanelHero: React.FC<ChatRightPanelHeroProps> = ({
  contact,
  contactName,
  isGroup,
  isLinkedCustomer,
  ordersCount,
  ltv,
  activeTab,
  onTabChange,
  onOpenOrder,
  onOpenServiceOrder,
  onOpenTasks,
  onOpenLabels,
  onClose,
}) => {
  const customerStatus = contact.customer?.status || 'LEAD';
  const statusMeta = STATUS_MAP[customerStatus] || STATUS_MAP.LEAD;
  const navigate = useNavigate();

  // 🆕 Wave 2b-1: من شات واتساب → سجل الليد في CRM مباشرة
  const handleOpenCRMLead = () => {
    if (contact.customer?.id) {
      navigate(`/customers/${contact.customer.id}`);
    }
  };

  return (
    <div className="shrink-0 border-b border-border/50 bg-card/60">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 shrink-0 border border-border/60">
              <AvatarImage
                src={getInboxExternalImageUrl(contact.profilePicUrl) || undefined}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-bold text-primary">
                {getContactInitials(contactName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-foreground" title={contactName}>
                {contactName}
              </h3>
              {!isGroup && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: statusMeta.color }}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {statusMeta.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="size-8 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* Quick Actions Row */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenOrder}
            className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
          >
            <ShoppingBag className="size-3.5 text-primary" />
            <span>طلب جديد</span>
          </Button>

          {/* 🆕 Wave 2b-1: افتح الليد في CRM */}
          {contact.customer?.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCRMLead}
              className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" />
              <span>افتح في CRM</span>
            </Button>
          )}

          {onOpenServiceOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenServiceOrder}
              className="h-7 gap-1 px-2.5 text-[11px] font-semibold border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30"
            >
              <Wrench className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>طلب خدمة</span>
            </Button>
          )}

          {onOpenLabels && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenLabels}
              className="h-7 gap-1 px-2.5 text-[11px] font-semibold"
            >
              <Tag className="size-3.5 text-amber-500" />
              <span>التصنيفات</span>
            </Button>
          )}
        </div>

        {/* KPI Summary Banner */}
        {!isGroup && (
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-muted-foreground">الطلبات</p>
              <p className="mt-0.5 text-base font-bold font-mono tabular-nums text-foreground">
                {isLinkedCustomer ? ordersCount : 0}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-muted-foreground">إجمالي القيمة</p>
              <p className="mt-0.5 text-base font-bold font-mono tabular-nums text-primary">
                {isLinkedCustomer ? ltv.toLocaleString() : 0} ج.م
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-t border-border/50 bg-muted/10">
        {(['info', 'orders', 'activity'] as RightPanelTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'info' ? 'معلومات' : tab === 'orders' ? 'الطلبات' : 'النشاط'}
          </button>
        ))}
      </div>
    </div>
  );
};
