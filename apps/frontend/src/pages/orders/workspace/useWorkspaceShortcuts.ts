import { useEffect } from 'react';
import { WorkspaceOrder } from './types';

interface WorkspaceShortcutsOptions {
  orders: WorkspaceOrder[];
  selectedOrderId: string | null;
  onSelect: (orderId: string) => void;
  /** معطل أثناء فتح أي مودال أو كتابة في حقل */
  blocked: boolean;
}

/** j / ArrowDown و k / ArrowUp للتنقل بين طلبات الطابور */
export function useWorkspaceShortcuts({ orders, selectedOrderId, onSelect, blocked }: WorkspaceShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        blocked
      ) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        if (orders.length === 0) return;
        const idx = orders.findIndex((o) => o.id === selectedOrderId);
        if (idx !== -1 && idx + 1 < orders.length) {
          onSelect(orders[idx + 1].id);
        }
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        if (orders.length === 0) return;
        const idx = orders.findIndex((o) => o.id === selectedOrderId);
        if (idx > 0) {
          onSelect(orders[idx - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orders, selectedOrderId, onSelect, blocked]);
}
