import { FilterTab } from './types';

export interface QueueParamsInput {
  activeTab: FilterTab;
  sort: 'recent' | 'oldest' | 'attempts';
  assignedTo?: string | null;
  search?: string;
  page: number;
  withStats?: boolean;
}

/**
 * بناء باراميترات /agent-workspace/my-orders من حالة الطابور:
 * التاب يترجم إلى status أو followUpOnly، والسلات تُجلب مع pending/all في الصفحة الأولى فقط.
 */
export function buildQueueParams({
  activeTab,
  sort,
  assignedTo,
  search,
  page,
  withStats = true,
}: QueueParamsInput): {
  params: Record<string, string | number>;
  fetchIncomplete: boolean;
} {
  const params: Record<string, string | number> = {
    page,
    limit: 50,
    sort,
  };

  if (withStats) {
    params['withStats'] = 1;
  }

  if (assignedTo) {
    params['assignedTo'] = assignedTo;
  }

  if (search && search.trim()) {
    params['search'] = search.trim();
  }

  switch (activeTab) {
    case 'pending':
      params['status'] = 'PENDING';
      break;
    case 'confirmed':
      params['status'] = 'CONFIRMED';
      break;
    case 'cancelled':
      params['status'] = 'CANCELLED';
      break;
    case 'followup':
      params['followUpOnly'] = 'true';
      break;
    case 'all':
    default:
      break;
  }

  const fetchIncomplete = (activeTab === 'pending' || activeTab === 'all') && page === 1;

  return { params, fetchIncomplete };
}
