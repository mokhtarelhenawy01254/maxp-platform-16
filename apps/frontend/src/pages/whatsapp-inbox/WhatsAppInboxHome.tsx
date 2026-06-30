import React from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import WhatsAppInbox from './WhatsAppInbox';
import WhatsAppRoutingWorkspace from './WhatsAppRoutingWorkspace';

const adminRoles = new Set(['SUPER_ADMIN', 'OWNER', 'COMPANY_ADMIN']);

const WhatsAppInboxHome: React.FC = () => {
  const { user } = useAuth();

  if (user?.role && adminRoles.has(user.role)) {
    return <WhatsAppRoutingWorkspace />;
  }

  return <WhatsAppInbox />;
};

export default WhatsAppInboxHome;
