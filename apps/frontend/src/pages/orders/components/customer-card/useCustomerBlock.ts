import { useState, useEffect } from "react";
import { useAuth } from "../../../../hooks/useAuthSimple";
import { OrderDetailsType } from "../types";
import {
  customerBlocklistService,
  CustomerBlockAction,
  CustomerBlockEvaluation,
  CustomerBlockReasonCode,
} from "../../../../services/customerBlocklistService";

export function useCustomerBlock(order: OrderDetailsType) {
  const { user } = useAuth();
  const [customerBlock, setCustomerBlock] =
    useState<CustomerBlockEvaluation | null>(null);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({
    reasonCode: "REPEATED_REFUSAL" as CustomerBlockReasonCode,
    reasonNote: "",
    action: "BLOCK_ORDERS" as CustomerBlockAction,
    expiresAt: "",
  });

  const isBlockAdmin = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
    "MANAGER",
    "ADMIN",
  ].includes(user?.role || "");

  const hasBlockIdentifier = Boolean(
    order.customerId || order.customerPhone || order.customerEmail,
  );

  useEffect(() => {
    if (!isBlockAdmin || !hasBlockIdentifier) {
      setCustomerBlock(null);
      return;
    }

    let cancelled = false;

    const checkCustomerBlock = async () => {
      try {
        setCheckingBlock(true);
        const result = await customerBlocklistService.check({
          customerId: order.customerId || undefined,
          phone: order.customerPhone || undefined,
          email: order.customerEmail || undefined,
          source: "manual",
          paymentMethod: order.paymentMethod,
        });

        if (!cancelled) {
          setCustomerBlock(result?.rule || result?.blocked ? result : null);
        }
      } catch (_error) {
        if (!cancelled) {
          setCustomerBlock(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingBlock(false);
        }
      }
    };

    void checkCustomerBlock();

    return () => {
      cancelled = true;
    };
  }, [
    hasBlockIdentifier,
    isBlockAdmin,
    order.customerEmail,
    order.customerId,
    order.customerPhone,
    order.paymentMethod,
  ]);

  const handleBlockCustomer = async () => {
    setSavingBlock(true);
    try {
      const rule = await customerBlocklistService.createRule({
        customerId: order.customerId || undefined,
        phone: order.customerPhone || undefined,
        email: order.customerEmail || undefined,
        reasonCode: blockForm.reasonCode,
        reasonNote: blockForm.reasonNote.trim() || undefined,
        action: blockForm.action,
        expiresAt: blockForm.expiresAt || undefined,
        metadata: {
          source: "order_details",
          orderNumber: order.orderNumber,
        },
      });

      setCustomerBlock({
        blocked: true,
        action: rule.action,
        message: "هذا العميل محظور من إنشاء الطلبات",
        rule,
      });
      setShowBlockModal(false);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "فشل في حظر العميل");
    } finally {
      setSavingBlock(false);
    }
  };

  const handleUnblockCustomer = async () => {
    const ruleId = customerBlock?.rule?.id;
    if (!ruleId) return;

    setSavingBlock(true);
    try {
      await customerBlocklistService.liftRule(
        ruleId,
        `تم فك الحظر من تفاصيل الطلب ${order.orderNumber}`,
      );
      setCustomerBlock(null);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || "فشل في فك الحظر");
    } finally {
      setSavingBlock(false);
    }
  };

  return {
    customerBlock,
    checkingBlock,
    showBlockModal,
    setShowBlockModal,
    savingBlock,
    blockForm,
    setBlockForm,
    isBlockAdmin,
    hasBlockIdentifier,
    handleBlockCustomer,
    handleUnblockCustomer,
  };
}
