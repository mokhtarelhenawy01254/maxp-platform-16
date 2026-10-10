import { useEffect } from 'react';
import { WorkspaceOrder } from './types';

interface WorkspaceShortcutsOptions {
  orders: WorkspaceOrder[];
  selectedOrderId: string | null;
  onSelect: (orderId: string) => void;
  onConfirm?: () => void;
  onLogCall?: (result: string) => void;
  /** معطل أثناء فتح أي مودال أو كتابة في حقل */
  blocked: boolean;
}

/** 
 * اختصارات لوحة المفاتيح:
 * - j / ArrowDown و k / ArrowUp للتنقل بين طلبات الطابور
 * - c أو Space لتأكيد الطلب الحالي
 * - 1 إلى 5 لتسجيل نتائج المكالمة الفورية (1: لم يرد، 2: مشغول، 3: إعادة اتصال، 4: رقم خاطئ، 5: تم الرد)
 */
export function useWorkspaceShortcuts({
  orders,
  selectedOrderId,
  onSelect,
  onConfirm,
  onLogCall,
  blocked,
}: WorkspaceShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !target ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
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
      } else if (event.key === 'c' || event.key === 'C' || event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        onConfirm?.();
      } else if (event.key === '1') {
        event.preventDefault();
        onLogCall?.('unreached');
      } else if (event.key === '2') {
        event.preventDefault();
        onLogCall?.('busy');
      } else if (event.key === '3') {
        event.preventDefault();
        onLogCall?.('callback');
      } else if (event.key === '4') {
        event.preventDefault();
        onLogCall?.('wrong_number');
      } else if (event.key === '5') {
        event.preventDefault();
        onLogCall?.('reached');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orders, selectedOrderId, onSelect, onConfirm, onLogCall, blocked]);
}
