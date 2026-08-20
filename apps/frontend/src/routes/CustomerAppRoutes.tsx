import React from 'react';
import { Route } from 'react-router-dom';

const CustomerList = React.lazy(() => import('../pages/customers/CustomerList'));
const CustomerCreate = React.lazy(() => import('../pages/customers/CustomerCreate'));
const LeadsList = React.lazy(() => import('../pages/customers/LeadsList'));
const CustomerDetails = React.lazy(() => import('../pages/customers/CustomerDetails'));
const CustomerEdit = React.lazy(() => import('../pages/customers/CustomerEdit'));
const CustomerWhatsAppNotify = React.lazy(() => import('../pages/customers/CustomerWhatsAppNotify'));
const CustomerBirthdayWhatsAppNotify = React.lazy(() => import('../pages/customers/CustomerBirthdayWhatsAppNotify'));
const CustomerOccasionsWhatsAppNotify = React.lazy(() => import('../pages/customers/CustomerOccasionsWhatsAppNotify'));

export const renderCustomerRoutes = () => (
    <>
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/create" element={<CustomerCreate />} />
        <Route path="/customers/leads" element={<LeadsList />} />
        <Route path="/customers/whatsapp-notify" element={<CustomerWhatsAppNotify />} />
        <Route path="/customers/birthday-whatsapp-notify" element={<CustomerBirthdayWhatsAppNotify />} />
        <Route path="/customers/occasions-whatsapp-notify" element={<CustomerOccasionsWhatsAppNotify />} />
        <Route path="/customers/:id" element={<CustomerDetails />} />
        <Route path="/customers/:id/edit" element={<CustomerEdit />} />
    </>
);
