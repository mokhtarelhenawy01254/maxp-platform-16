import React from 'react';
import { Navigate } from 'react-router-dom';

const InboxNotifications: React.FC = () => {
  return <Navigate to="/settings/inbox" replace />;
};

export default InboxNotifications;
