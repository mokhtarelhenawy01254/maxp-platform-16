export interface ConvertedOrdersDestiny {
  totalConverted: number;
  delivered: { count: number; value: number; rate: number };
  returned: { count: number; value: number; rate: number };
  cancelled: { count: number; value: number; rate: number };
  inProgress: { count: number; value: number; rate: number };
  deliveryRate: number;
  effectiveDeliveryRate: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
    value: number;
    rate: number;
  }>;
}

export interface ConvertedOrdersDestinyCardProps {
  destiny?: ConvertedOrdersDestiny;
}
