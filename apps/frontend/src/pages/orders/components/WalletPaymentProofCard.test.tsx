import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletPaymentProofCard } from "./WalletPaymentProofCard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("WalletPaymentProofCard", () => {
  const defaultProof = {
    id: "prf-1",
    status: "PENDING",
    walletNumber: "01012345678",
    transferRef: "TRF-7788",
    submittedAt: "2026-10-18T10:00:00Z",
  };

  it("renders pending proof details without emojis and with tabular numerals", () => {
    const onVerify = jest.fn();
    render(<WalletPaymentProofCard proof={defaultProof} onVerify={onVerify} />);

    expect(screen.getByText("إثبات الدفع بالمحفظة")).toBeInTheDocument();
    expect(screen.getByText("01012345678")).toBeInTheDocument();
    expect(screen.getByText("TRF-7788")).toBeInTheDocument();
    expect(screen.getByText("بانتظار المراجعة")).toBeInTheDocument();
  });

  it("calls onVerify when verify button is clicked", () => {
    const onVerify = jest.fn().mockResolvedValue(true);
    render(<WalletPaymentProofCard proof={defaultProof} onVerify={onVerify} />);

    const confirmBtn = screen.getByText("تأكيد الدفع");
    fireEvent.click(confirmBtn);

    expect(onVerify).toHaveBeenCalledWith("VERIFY");
  });
});
