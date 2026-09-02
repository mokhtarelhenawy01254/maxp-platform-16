import React from 'react';
import TrustedBadgePanel from '../../../components/TrustedBadgePanel';

export const ConfigurableTrustBadges = ({
  title,
  subtitle,
  items,
  variant = 'strip',
}: {
  title?: string;
  subtitle?: string;
  items?: string[];
  variant?: 'strip' | 'grid' | 'minimal';
}) => (
  <TrustedBadgePanel
    title={title}
    subtitle={subtitle}
    items={items}
    variant={variant}
  />
);

ConfigurableTrustBadges.displayName = 'ConfigurableTrustBadges';
export default ConfigurableTrustBadges;