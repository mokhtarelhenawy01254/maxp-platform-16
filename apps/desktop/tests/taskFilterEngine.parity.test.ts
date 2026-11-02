/**
 * Desktop Parity Test for Unified Task Filter Engine
 * Asserts identical behavior between web and desktop engines.
 */
import {
  matchesUnifiedFilter,
  filterTasksWithUnifiedEngine,
  parseUnifiedFiltersFromUrl,
  serializeUnifiedFiltersToQuery,
  defaultUnifiedTaskFilters,
  UnifiedTaskFilters,
} from '../src/renderer/components/tasks/taskFilterEngine';

export const runDesktopParityVerification = () => {
  const fixture = [
    { id: 't-1', assignedTo: 'user-1', status: 'IN_REVIEW', priority: 'HIGH' },
    { id: 't-2', assignedTo: 'user-2', status: 'IN_REVIEW', priority: 'MEDIUM' },
    { id: 't-3', assignedTo: 'user-1', status: 'COMPLETED', priority: 'LOW' },
    { id: 't-4', assignedTo: 'user-1', status: 'IN_REVIEW', priority: 'URGENT' },
  ];

  const filter: UnifiedTaskFilters = {
    ...defaultUnifiedTaskFilters,
    assignedTo: 'user-1',
    status: 'in_review',
  };

  const results = filterTasksWithUnifiedEngine(fixture, filter);
  if (results.length !== 2 || results[0].id !== 't-1' || results[1].id !== 't-4') {
    throw new Error(`Desktop parity verification failed: got ${JSON.stringify(results)}`);
  }
  return true;
};
