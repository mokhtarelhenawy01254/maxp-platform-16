import React from 'react';
import type {
  ReturnRequest,
  ActivityLog,
  ReturnShippingCompany,
  ReturnType,
} from '../../../services/returnService';
import { ReturnActivityReviewedDetails } from './ReturnActivityReviewedDetails';
import { ReturnActivityEventBadges } from './ReturnActivityEventBadges';

export interface ReturnActivityDetailsProps {
  log: ActivityLog;
  request: ReturnRequest;
  reasons: Array<{ id: string; reason?: string }>;
  shippingCompanies: ReturnShippingCompany[];
  returnTypes: ReturnType[];
}

export const ReturnActivityDetails: React.FC<ReturnActivityDetailsProps> = ({
  log,
  request,
  reasons,
  shippingCompanies,
  returnTypes,
}) => {
  let details: unknown = log.details;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      // Keep as string
    }
  }

  if (log.action === 'REVIEWED') {
    return (
      <ReturnActivityReviewedDetails
        details={typeof details === 'object' && details !== null ? (details as Record<string, unknown>) : null}
        request={request}
        reasons={reasons}
        shippingCompanies={shippingCompanies}
        returnTypes={returnTypes}
      />
    );
  }

  const badgeElement = <ReturnActivityEventBadges action={log.action} details={details} />;
  if (badgeElement.props.action && ['AUTO_CREATED', 'CONTACT_ATTEMPT', 'STATUS_CHANGE', 'UPDATED', 'NOTE_ADDED', 'CREATED'].includes(log.action)) {
    return badgeElement;
  }

  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
    return null;
  }

  return (
    <div className="text-xs bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
      {typeof details === 'string' ? details : JSON.stringify(details)}
    </div>
  );
};
