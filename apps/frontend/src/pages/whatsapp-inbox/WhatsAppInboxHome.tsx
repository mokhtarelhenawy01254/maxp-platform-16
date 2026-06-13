import React from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import WhatsAppInbox from './WhatsAppInbox';
import WhatsAppNumberSettings from './WhatsAppNumberSettings';

const adminRoles = new Set(['SUPER_ADMIN', 'OWNER', 'COMPANY_ADMIN']);

const WhatsAppInboxHome: React.FC = () => {
  const { user } = useAuth();

  if (user?.role && adminRoles.has(user.role)) {
    return <WhatsAppNumberSettings />;
  }

  return <WhatsAppInbox />;
};

export default WhatsAppInboxHome;
