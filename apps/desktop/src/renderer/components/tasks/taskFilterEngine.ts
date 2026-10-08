/**
 * Unified Task Filter Engine for MaxP Platform (Desktop)
 * Shared deterministic filtering logic between Web and Desktop.
 */

export interface UnifiedTaskFilters {
  search: string;
  assignedTo: string; // 'all' or userId
  status: string; // 'all', 'pending', 'in_progress', 'completed', 'cancelled', 'in_review', 'revision'
  priority: string; // 'all', 'low', 'medium', 'high', 'urgent'
  dueDateFrom: string; // YYYY-MM-DD
  dueDateTo: string; // YYYY-MM-DD
  tag: string; // 'all' or specific tag name
  returnedOnly?: boolean; // When true, filters strictly tasks that were returned for revision
  returnReasonType?: string; // 'all' or specific reason e.g. 'WRONG_EXECUTION', 'MISSING_EVIDENCE', etc.
  chronicOnly?: boolean; // When true, filters tasks that were returned more than once (returnCount >= 2)
}

export const defaultUnifiedTaskFilters: UnifiedTaskFilters = {
  search: '',
  assignedTo: 'all',
  status: 'all',
  priority: 'all',
  dueDateFrom: '',
  dueDateTo: '',
  tag: 'all',
  returnedOnly: false,
  returnReasonType: 'all',
  chronicOnly: false,
};

const STORAGE_KEY = 'maxp_tasks_unified_filters';

/**
 * Normalizes status strings across different representations
 */
export function normalizeTaskStatus(status: unknown): string {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'in_review' || s === 'pending_review') return 'in_review';
  if (s === 'in_progress') return 'in_progress';
  return s;
}

/**
 * Normalizes priority strings across different representations
 */
export function normalizeTaskPriority(priority: unknown): string {
  return String(priority || '').trim().toLowerCase();
}

/**
 * Checks if a task has revision tag or status or returnCount
 */
export function isTaskNeedsRevision(task: any): boolean {
  if (!task) return false;
  const rawStatus = String(task?.status || '').toUpperCase();
  if (rawStatus === 'REVISION') return true;
  if (task?.returnCount && Number(task.returnCount) > 0 && rawStatus !== 'COMPLETED') return true;
  const tags = task?.tags;
  if (!tags) return false;
  if (Array.isArray(tags)) return tags.includes('needs_revision');
  if (typeof tags === 'string') {
    try {
      const p = JSON.parse(tags);
      if (Array.isArray(p)) return p.includes('needs_revision');
    } catch {
      return tags.includes('needs_revision');
    }
  }
  return false;
}

/**
 * Extracts all tags as an array of lowercase strings
 */
export function extractTaskTags(task: any): string[] {
  const raw = task?.tags;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      // split comma separated
      return raw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Core matching function: evaluates a task against unified filters.
 * Returns true if the task passes all active criteria.
 */
export function matchesUnifiedFilter(task: any, filters: UnifiedTaskFilters): boolean {
  if (!task) return false;

  // 1. Text Search (Multi-field Tokenized matching)
  if (filters.search && filters.search.trim()) {
    const tokens = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const idStr = String(task.id || '').toLowerCase();
      const titleStr = String(task.title || task.taskTitle || '').toLowerCase();
      const descStr = String(task.description || '').toLowerCase();

      // Assignee name & email
      const assigneeName = String(
        task.assignedToName ||
          (task.assignee ? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''} ${task.assignee.name || ''} ${task.assignee.email || ''}` : '') ||
          (task.assignedUser ? `${task.assignedUser.firstName || ''} ${task.assignedUser.lastName || ''} ${task.assignedUser.name || ''} ${task.assignedUser.email || ''}` : '') ||
          task.userName ||
          ''
      ).toLowerCase();

      // Creator name & email
      const creatorName = String(
        task.createdByName ||
          (task.creator ? `${task.creator.firstName || ''} ${task.creator.lastName || ''} ${task.creator.name || ''} ${task.creator.email || ''}` : '') ||
          ''
      ).toLowerCase();

      // Project name
      const projName = String(task.projectName || task.project?.name || '').toLowerCase();

      // Tags
      const tagsList = extractTaskTags(task);
      const tagsStr = tagsList.join(' ');

      // Dates
      const dueDateStr = task.dueDate || task.due_date ? String(task.dueDate || task.due_date).slice(0, 10) : '';
      const createdAtStr = task.createdAt ? String(task.createdAt).slice(0, 10) : '';
      const startTimeStr = task.startTime ? String(task.startTime).slice(0, 10) : '';

      // Every token must match at least one attribute of the task
      const allTokensMatch = tokens.every((token) => {
        return (
          idStr.includes(token) ||
          titleStr.includes(token) ||
          descStr.includes(token) ||
          assigneeName.includes(token) ||
          creatorName.includes(token) ||
          projName.includes(token) ||
          tagsStr.includes(token) ||
          dueDateStr.includes(token) ||
          createdAtStr.includes(token) ||
          startTimeStr.includes(token)
        );
      });

      if (!allTokensMatch) {
        return false;
      }
    }
  }

  // 2. User Filter (Team Member)
  if (filters.assignedTo && filters.assignedTo !== 'all') {
    const targetUserId = String(filters.assignedTo).trim().toLowerCase();
    const taskAssignedTo = String(
      task.assignedTo ||
        task.assignedToId ||
        task.userId ||
        task.assignee?.id ||
        task.assignedUser?.id ||
        ''
    ).trim().toLowerCase();

    const taskAssigneeName = String(
      task.assignedToName ||
        (task.assignee ? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}` : '') ||
        (task.assignedUser ? `${task.assignedUser.firstName || ''} ${task.assignedUser.lastName || ''}` : '') ||
        task.userName ||
        ''
    ).trim().toLowerCase();

    const matchesId = taskAssignedTo === targetUserId;
    const matchesName = taskAssigneeName.includes(targetUserId);

    if (!matchesId && !matchesName) {
      return false;
    }
  }

  // 3. Status Filter
  if (filters.status && filters.status !== 'all') {
    const filterStatus = normalizeTaskStatus(filters.status);
    if (filterStatus === 'revision') {
      if (!isTaskNeedsRevision(task)) return false;
    } else {
      const taskStatus = normalizeTaskStatus(task.status);
      if (taskStatus !== filterStatus) {
        return false;
      }
    }
  }

  // 3b. Dedicated Returned For Revision Filter (Quick Toggle or engine rule)
  if (filters.returnedOnly) {
    if (!isTaskNeedsRevision(task)) {
      return false;
    }
  }

  // 3c. Chronic Returns (Multiple reworks: returnCount >= 2)
  if (filters.chronicOnly) {
    const count = Number(task.returnCount || 0);
    if (count < 2) {
      return false;
    }
  }

  // 3d. Return Reason Type Filter
  if (filters.returnReasonType && filters.returnReasonType !== 'all') {
    const rType = String(task.returnReasonType || task.return_reason_type || '').toUpperCase();
    if (rType !== filters.returnReasonType.toUpperCase()) {
      return false;
    }
  }

  // 4. Priority Filter
  if (filters.priority && filters.priority !== 'all') {
    const filterPriority = normalizeTaskPriority(filters.priority);
    const taskPriority = normalizeTaskPriority(task.priority);
    if (taskPriority !== filterPriority) {
      return false;
    }
  }

  // 5. Date Range Filter
  const taskDate = (
    task.dueDate ||
    task.due_date ||
    task.startTime ||
    task.createdAt ||
    ''
  ).toString().slice(0, 10);

  if (filters.dueDateFrom && taskDate && taskDate < filters.dueDateFrom) {
    return false;
  }
  if (filters.dueDateTo && taskDate && taskDate > filters.dueDateTo) {
    return false;
  }

  // 6. Tag Filter
  if (filters.tag && filters.tag !== 'all') {
    const targetTag = filters.tag.trim().toLowerCase();
    const tagsList = extractTaskTags(task);
    const hasTag = tagsList.some((t) => t.includes(targetTag));
    if (!hasTag) {
      return false;
    }
  }

  return true;
}

/**
 * Filter an array of tasks using the unified filter engine
 */
export function filterTasksWithUnifiedEngine<T = any>(
  tasks: T[],
  filters: UnifiedTaskFilters
): T[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((t) => matchesUnifiedFilter(t, filters));
}

/**
 * Parses unified filters from URL search params or hash query string
 */
export function parseUnifiedFiltersFromUrl(
  searchOrHash: string = typeof window !== 'undefined' ? (window.location.hash || window.location.search) : '',
  fallback: UnifiedTaskFilters = defaultUnifiedTaskFilters
): UnifiedTaskFilters {
  try {
    let queryStr = searchOrHash;
    if (queryStr.includes('?')) {
      queryStr = queryStr.slice(queryStr.indexOf('?') + 1);
    }
    const params = new URLSearchParams(queryStr);
    return {
      search: params.get('search') ?? fallback.search,
      assignedTo: params.get('assignedTo') ?? fallback.assignedTo,
      status: params.get('status') ?? fallback.status,
      priority: params.get('priority') ?? fallback.priority,
      dueDateFrom: params.get('dueDateFrom') ?? fallback.dueDateFrom,
      dueDateTo: params.get('dueDateTo') ?? fallback.dueDateTo,
      tag: params.get('tag') ?? fallback.tag,
      returnedOnly: params.get('returnedOnly') === 'true' ? true : fallback.returnedOnly ?? false,
      returnReasonType: params.get('returnReasonType') ?? fallback.returnReasonType ?? 'all',
      chronicOnly: params.get('chronicOnly') === 'true' ? true : fallback.chronicOnly ?? false,
    };
  } catch {
    return { ...fallback };
  }
}

/**
 * Serializes unified filters to URL search string (e.g. "?search=abc&assignedTo=123")
 */
export function serializeUnifiedFiltersToQuery(
  filters: UnifiedTaskFilters,
  existingParams?: URLSearchParams
): string {
  const params = existingParams ? new URLSearchParams(existingParams) : new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  else params.delete('search');

  if (filters.assignedTo && filters.assignedTo !== 'all') params.set('assignedTo', filters.assignedTo);
  else params.delete('assignedTo');

  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  else params.delete('status');

  if (filters.priority && filters.priority !== 'all') params.set('priority', filters.priority);
  else params.delete('priority');

  if (filters.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom);
  else params.delete('dueDateFrom');

  if (filters.dueDateTo) params.set('dueDateTo', filters.dueDateTo);
  else params.delete('dueDateTo');

  if (filters.tag && filters.tag !== 'all') params.set('tag', filters.tag);
  else params.delete('tag');

  if (filters.returnedOnly) params.set('returnedOnly', 'true');
  else params.delete('returnedOnly');

  if (filters.returnReasonType && filters.returnReasonType !== 'all') params.set('returnReasonType', filters.returnReasonType);
  else params.delete('returnReasonType');

  if (filters.chronicOnly) params.set('chronicOnly', 'true');
  else params.delete('chronicOnly');

  const str = params.toString();
  return str ? `?${str}` : '';
}

/**
 * Persists filters to local storage
 */
export function persistUnifiedFilters(filters: UnifiedTaskFilters): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {}
}

/**
 * Loads filters from local storage, with fallback to defaults
 */
export function loadPersistedUnifiedFilters(): UnifiedTaskFilters {
  if (typeof window === 'undefined') return { ...defaultUnifiedTaskFilters };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultUnifiedTaskFilters,
        ...parsed,
      };
    }
  } catch {}
  return { ...defaultUnifiedTaskFilters };
}
