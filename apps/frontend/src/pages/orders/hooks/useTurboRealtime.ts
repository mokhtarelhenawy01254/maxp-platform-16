import React, { useEffect } from "react";
import { socketService } from "../../../services/socketService";
import { toast } from "sonner";
import i18n from "../../../i18n";

export interface TurboTrackingData {
  status: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  branch?: string;
  history?: any[];
}

export interface ShippingComparison {
  actualCost: number;
  customerCost: number;
  difference: number;
}

export interface UseTurboRealtimeParams {
  order: any;
  setOrder: (updater: any) => void;
  user: any;
  setTurboTrackingData: React.Dispatch<React.SetStateAction<TurboTrackingData | null>>;
  setShippingComparison: React.Dispatch<React.SetStateAction<ShippingComparison | null>>;
}

export const useTurboRealtime = ({
  order,
  setOrder,
  user,
  setTurboTrackingData,
  setShippingComparison,
}: UseTurboRealtimeParams): void => {
  // Socket Listener for Real-time Updates
  useEffect(() => {
    if (!order?.id || !user?.companyId) return;

    if (!socketService.isConnected()) {
      socketService.connect();
    }

    const socket = socketService.getSocket();
    if (!socket) return;

    if (!socket.connected) {
      socket.once("connect", () => {
        if (user.companyId) {
          socket.emit("join_company_room", { companyId: user.companyId });
        }
      });
    }

    const handleTurboUpdate = (data: any) => {
      if (data.orderNumber === order.orderNumber || data.orderId === order.id) {
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                turboShipmentStatus: data.status,
                turboTrackingNumber:
                  data.trackingNumber || prev.turboTrackingNumber,
                updatedAt: new Date().toISOString(),
              }
            : null,
        );

        if (data.data) {
          setTurboTrackingData({
            status: data.status,
            currentLocation: data.data.currentLocation || data.data.location,
            estimatedDelivery:
              data.data.estimatedDelivery || data.data.expected_delivery,
            deliveredAt: data.data.deliveredAt || data.data.delivery_date,
            branch: data.data.branch || data.data.expected_branch,
            history: data.data.history || [],
          });
        }

        // Show notification
        if (data.status === "delivered") {
          toast.success(i18n.t("turbo.shipmentDelivered"));
        } else if (data.status === "cancelled") {
          toast.error(i18n.t("turbo.shipmentCancelled"));
        } else if (data.status === "returned") {
          toast.error(i18n.t("turbo.shipmentReturned"));
        } else {
          toast(i18n.t("turbo.statusUpdate", { status: data.status }), {
            icon: "🚚",
          });
        }
      }
    };

    socket.on("turbo_shipment_update", handleTurboUpdate);

    // Rejoin on reconnect
    const handleReconnect = () => {
      if (user?.companyId) {
        socket.emit("join_company_room", { companyId: user.companyId });
      }
    };
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("turbo_shipment_update", handleTurboUpdate);
      socket.off("connect", handleReconnect);
    };
  }, [order?.id, order?.orderNumber, user?.companyId, setOrder, setTurboTrackingData]);

  // Auto-initialize shipping comparison whenever order updates
  useEffect(() => {
    if (!order) return;
    let actualCost =
      order.shippingCost !== undefined
        ? Number(order.shippingCost)
        : order.shipping !== undefined
          ? Number(order.shipping)
          : 70;
    if (order.turboMetadata) {
      try {
        const meta =
          typeof order.turboMetadata === "string"
            ? JSON.parse(order.turboMetadata)
            : order.turboMetadata;
        if (meta.actualShippingCost) {
          actualCost = Number(meta.actualShippingCost);
        }
      } catch (_e) {
        // ignore
      }
    }
    const customerCost = Number(order.shipping || 0);
    setShippingComparison({
      actualCost: actualCost,
      customerCost: customerCost,
      difference: actualCost - customerCost,
    });
  }, [order?.id, order?.shipping, order?.shippingCost, order?.turboMetadata, setShippingComparison]);
};
