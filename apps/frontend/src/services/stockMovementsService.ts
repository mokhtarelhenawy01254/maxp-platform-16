import api from './api';

export interface StockMovementRecord {
  id: string;
  type: string;
  reason: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  userName: string | null;
  createdAt: string;
  isApproved: boolean;
  product: { name: string; sku: string | null };
  warehouse: { name: string };
}

export interface StockMovementsResponse {
  success: boolean;
  data: StockMovementRecord[];
}

const stockMovementsService = {
  getMovements: (params?: Record<string, any>): Promise<StockMovementsResponse> =>
    api.get<StockMovementsResponse>('/inventory/movements', { params }).then((res) => res.data)
};

export default stockMovementsService;
