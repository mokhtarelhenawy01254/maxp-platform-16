import type { FilterState } from '@/components/facebook-inbox/FilterPanel/FilterPanel';
import type {
  InboxConversation,
  InboxTab,
} from '@/types/inbox.types';

export interface ApplyClientSideFiltersParams {
  filters: FilterState;
  activeTab: InboxTab;
  userId?: string;
}

/**
 * Applies client-side filters that lack server-side filtering support.
 * Does NOT perform any text-based matching (search is handled exclusively server-side).
 */
export function applyClientSideFilters(
  conversations: InboxConversation[],
  { filters, activeTab, userId }: ApplyClientSideFiltersParams
): InboxConversation[] {
  return conversations.filter((conv) => {
    if (filters.unreadOnly && conv.unreadCount === 0) return false;
    if (
      (filters.priorityOnly || activeTab === 'priority') &&
      !conv.priority
    ) {
      return false;
    }

    if (filters.failedDeliveryOnly) {
      const hasFailed = Boolean(conv.hasFailedDelivery || conv.lastMessageDeliveryStatus === 'FAILED');
      if (!hasFailed) return false;
    }

    if (filters.windowStatus && filters.windowStatus !== 'all') {
      let isExpired = Boolean(conv.isWindowExpired);
      if (conv.windowExpiresAt) {
        isExpired = Date.now() > new Date(conv.windowExpiresAt).getTime();
      } else if (conv.lastInboundAt) {
        isExpired = Date.now() > new Date(conv.lastInboundAt).getTime() + 24 * 60 * 60 * 1000;
      } else if (conv.lastMessageIsFromCustomer && conv.lastMessageTime) {
        const msgTime = new Date(conv.lastMessageTime).getTime();
        if (!isNaN(msgTime) && (Date.now() - msgTime) <= 24 * 60 * 60 * 1000) {
          isExpired = false;
        }
      }
      if (filters.windowStatus === 'open' && isExpired) return false;
      if (filters.windowStatus === 'expired' && !isExpired) return false;
    }

    if (filters.assignedTo === 'me' && conv.assignedTo !== userId) {
      return false;
    }
    if (filters.assignedTo === 'unassigned' && conv.assignedTo !== null) {
      return false;
    }

    if (filters.startDate || filters.endDate) {
      const convDate = new Date(conv.lastMessageTime);
      if (filters.startDate && convDate < filters.startDate) return false;
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (convDate > endOfDay) return false;
      }
    }

    return true;
  });
}
