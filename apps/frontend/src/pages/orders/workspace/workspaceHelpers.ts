import { FilterTab, WorkspaceOrder } from './types';

export function normalizeWorkspaceTab(value: string | null): FilterTab {
  if (!value) return 'pending';
  const val = value.toLowerCase();
  if (val === 'incomplete' || val === 'abandoned' || val === 'carts') return 'incomplete';
  if (val === 'reports') return 'reports';
  if (val === 'followup' || val === 'follow_up' || val === 'follow-up') return 'followup';
  return 'pending';
}

export function getHoursSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

export function isOrderOverdue(order: WorkspaceOrder): boolean {
  const status = String(order.status || 'PENDING').toUpperCase();
  if (status !== 'PENDING') {
    return false;
  }

  if (order.callAttempts === 0 && getHoursSince(order.createdAt) > 24) return true;
  if (order.callAttempts > 0 && getHoursSince(order.lastCallAt) > 12) return true;
  return false;
}
