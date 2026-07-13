import React from 'react';
import { Navigate } from 'react-router-dom';

const InboxNotifications: React.FC = () => {
  return <Navigate to="/whatsapp-inbox" replace />;
};

export default InboxNotifications;
