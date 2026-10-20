export interface SupplierOption {
  id: string;
  name: string;
}

export interface AgingInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  dueDate: string | null;
  daysPastDue: number;
  remainingAmount: number;
}

export interface AgingBucket {
  count: number;
  amount: number;
  invoices: AgingInvoice[];
}

export interface AgingReportData {
  current: AgingBucket;
  days30: AgingBucket;
  days60: AgingBucket;
  days90: AgingBucket;
  over90: AgingBucket;
}

export interface SupplierReportRow {
  supplierId: string;
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  totalOrders: number;
  totalOrderAmount: number;
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalPayments: number;
  totalPaidAmount: number;
  currentBalance: number;
  rating?: number;
}

export interface PurchaseOrderReportRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string;
  totalAmount: number | string;
  supplier?: { id: string; name: string };
  purchaseOrderItems?: Array<{ id: string; quantity: number }>;
}

export interface InvoiceReportRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  totalAmount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  supplier?: { id: string; name: string };
}

export interface PaymentReportRow {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number | string;
  paymentMethod: string;
  referenceNumber?: string;
  supplier?: { id: string; name: string };
  purchaseInvoice?: { id: string; invoiceNumber: string };
}

export interface ProductReportRow {
  productId?: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  orders: Array<{
    orderNumber: string;
    orderDate: string;
    supplierName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}
