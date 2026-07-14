import React from 'react';
import { User, Phone, ShoppingCart, ClipboardList, Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Contact } from '../../../hooks/useWhatsAppQueries';

interface ChatRightPanelProps {
  contact: Contact | null;
  onOpenLabels: () => void;
  onOpenOrder: () => void;
  onOpenTasks: () => void;
  onClose?: () => void;
}

const ChatRightPanel: React.FC<ChatRightPanelProps> = ({ contact, onOpenLabels, onOpenOrder, onOpenTasks, onClose }) => {
  if (!contact) return null;

  return (
    <aside className="flex w-80 flex-col border-l border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          التفاصيل
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" className="size-7 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-8" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{contact.name || contact.jid}</div>
            {contact.phoneNumber ? (
              <div className="mt-0.5 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Phone className="size-3.5" />
                <span dir="ltr">{contact.phoneNumber}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onOpenLabels}
          >
            <Tags className="size-4" />
            التصنيفات
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onOpenOrder}
          >
            <ShoppingCart className="size-4" />
            طلب جديد
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onOpenTasks}
          >
            <ClipboardList className="size-4" />
            مهمة جديدة
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default ChatRightPanel;
