// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ReturnActivityDetails, type ReturnActivityDetailsProps } from "../ReturnActivityDetails";
import type { ReturnRequest, ActivityLog } from "../../../../services/returnService";

afterEach(() => {
  cleanup();
});

describe("ReturnActivityDetails", () => {
  const mockRequest = {
    id: "ret-1",
    orderId: "ord-1",
    order: { id: "ord-1", currency: "EGP" } as unknown as NonNullable<ReturnRequest["order"]>,
    responsibleParty: "CUSTOMER",
    shippingReturnCost: 40,
    settlementAmount: 310,
    adminNotes: "ملاحظة إدارية",
    customerNotes: "ملاحظة العميل",
  } as ReturnRequest;

  const defaultProps: ReturnActivityDetailsProps = {
    log: {
      id: "log-1",
      returnRequestId: "ret-1",
      action: "REVIEWED",
      details: {
        responsibleParty: "CUSTOMER",
        reason: "مقاس غير مناسب",
        shippingCompany: "بوسطة",
        returnType: "استبدال فوري",
        shippingReturnCost: 40,
        settlementAmount: 310,
        adminNotes: "تم التدقيق والموافقة",
      },
      createdAt: "2026-10-15T12:00:00Z",
    } as ActivityLog,
    request: mockRequest,
    reasons: [{ id: "reas-1", reason: "مقاس غير مناسب" }],
    shippingCompanies: [],
    returnTypes: [],
  };

  it("renders reviewed details grid when action is REVIEWED", () => {
    render(<ReturnActivityDetails {...defaultProps} />);

    expect(screen.getByText("الجهة المسؤولة:")).toBeInTheDocument();
    expect(screen.getByText("سبب الإرجاع:")).toBeInTheDocument();
    expect(screen.getByText("مقاس غير مناسب")).toBeInTheDocument();
    expect(screen.getByText("شركة الشحن:")).toBeInTheDocument();
    expect(screen.getByText("بوسطة")).toBeInTheDocument();
    expect(screen.getByText("نوع المرتجع:")).toBeInTheDocument();
    expect(screen.getByText("استبدال فوري")).toBeInTheDocument();
    expect(screen.getByText(/40 EGP/)).toBeInTheDocument();
    expect(screen.getByText(/310 EGP/)).toBeInTheDocument();
    expect(screen.getByText("تم التدقيق والموافقة")).toBeInTheDocument();
  });

  it("renders success alert when REVIEWED action has no extra fields", () => {
    const emptyLog = {
      ...defaultProps.log,
      details: {},
    };
    const emptyRequest = {
      ...mockRequest,
      responsibleParty: undefined,
      shippingReturnCost: null,
      settlementAmount: null,
      adminNotes: undefined,
      customerNotes: undefined,
    } as unknown as ReturnRequest;

    render(<ReturnActivityDetails {...defaultProps} log={emptyLog} request={emptyRequest} />);

    expect(screen.getByText("تمت مراجعة طلب الإرجاع واعتماده بنجاح.")).toBeInTheDocument();
  });

  it("renders bot message for AUTO_CREATED action", () => {
    const autoLog = {
      id: "log-2",
      returnRequestId: "ret-1",
      action: "AUTO_CREATED",
      details: "إنشاء تلقائي",
      createdAt: "2026-10-15T12:00:00Z",
    } as ActivityLog;

    render(<ReturnActivityDetails {...defaultProps} log={autoLog} />);

    expect(screen.getByText("إنشاء تلقائي")).toBeInTheDocument();
  });

  it("renders contact attempt details for CONTACT_ATTEMPT action", () => {
    const contactLog = {
      id: "log-3",
      returnRequestId: "ret-1",
      action: "CONTACT_ATTEMPT",
      details: {
        method: "WHATSAPP",
        result: "NO_ANSWER",
        notes: "تم إرسال رسالة واتساب ولم يتم الرد",
      },
      createdAt: "2026-10-15T12:00:00Z",
    } as ActivityLog;

    render(<ReturnActivityDetails {...defaultProps} log={contactLog} />);

    expect(screen.getByText("واتساب (WhatsApp)")).toBeInTheDocument();
    expect(screen.getByText(/تم إرسال رسالة واتساب/)).toBeInTheDocument();
  });

  it("renders status change details for STATUS_CHANGE action", () => {
    const statusLog = {
      id: "log-4",
      returnRequestId: "ret-1",
      action: "STATUS_CHANGE",
      details: {
        from: "PENDING",
        to: "APPROVED",
        reason: "موافقة الإدارة",
      },
      createdAt: "2026-10-15T12:00:00Z",
    } as ActivityLog;

    render(<ReturnActivityDetails {...defaultProps} log={statusLog} />);

    expect(screen.getByText("تغيير الحالة:")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(screen.getByText(/موافقة الإدارة/)).toBeInTheDocument();
  });
});
