import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { storefrontApi } from "../utils/storefrontApi";

export interface Order {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  guestName: string;
  guestPhone: string;
  shippingAddress:
    | {
        governorate: string;
        city: string;
        street: string;
        building: string;
        floor: string;
        apartment: string;
      }
    | string;
  total: number;
  finalTotal: number;
  shippingCost: number;
  discountAmount: number;
  notes: string;
  items: Array<{
    name: string;
    productId: string;
    quantity: number;
    price: number;
    image?: string;
    productImage?: string;
    productColor?: string;
    productSize?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const useTrackOrder = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(
    searchParams.get("orderNumber") || ""
  );
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (searchParams.get("orderNumber") && searchParams.get("phone")) {
        handleSearch();
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!orderNumber || !phone) {
      toast.error("يرجى إدخال رقم الطلب ورقم الهاتف");
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      const data = await storefrontApi.trackOrder(orderNumber, phone);

      if (data.success) {
        setOrder(data.data);
      } else {
        setOrder(null);
        toast.error(data.error || "الطلب غير موجود");
      }
    } catch (error) {
      console.error("Error tracking order:", error);
      toast.error("حدث خطأ في تتبع الطلب");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "قيد المعالجة",
      CONFIRMED: "تم التأكيد",
      PROCESSING: "جاري التجهيز",
      SHIPPED: "تم الشحن",
      DELIVERED: "تم التوصيل",
      CANCELLED: "ملغي",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      PROCESSING: "bg-purple-100 text-purple-800",
      SHIPPED: "bg-indigo-100 text-indigo-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  return {
    orderNumber,
    setOrderNumber,
    phone,
    setPhone,
    order,
    loading,
    searched,
    handleSearch,
    getStatusText,
    getStatusColor,
  };
};
