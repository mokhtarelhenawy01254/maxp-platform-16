// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmployeeInviteModal from "../EmployeeInviteModal";
import api from "../../../services/api";
import * as clipboardModule from "../../../utils/clipboard";
import { toast } from "sonner";

vi.mock("../../../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EmployeeInviteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders correctly when open and handles copy action using clipboard utility", async () => {
    const copySpy = vi.spyOn(clipboardModule, "copyToClipboard").mockResolvedValue(true);

    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          invitationLink: "https://example.com/join?token=abc-123",
        },
      },
    });

    render(
      <EmployeeInviteModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const generateBtn = screen.getByRole("button", { name: /توليد رابط الدعوة/ });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("تم إنشاء الرابط وجاهز للإرسال:")).toBeTruthy();
    });

    const copyBtn = screen.getByRole("button", { name: /^نسخ$/ });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(copySpy).toHaveBeenCalledWith("https://example.com/join?token=abc-123");
      expect(toast.success).toHaveBeenCalledWith("تم نسخ الرابط إلى الحافظة");
    });
  });

  it("shows error toast if copying fails completely", async () => {
    vi.spyOn(clipboardModule, "copyToClipboard").mockResolvedValue(false);

    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          invitationLink: "https://example.com/join?token=fail-token",
        },
      },
    });

    render(
      <EmployeeInviteModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const generateBtn = screen.getByRole("button", { name: /توليد رابط الدعوة/ });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("تم إنشاء الرابط وجاهز للإرسال:")).toBeTruthy();
    });

    const copyBtn = screen.getByRole("button", { name: /^نسخ$/ });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("فشل نسخ الرابط، يرجى تحديده ونسخه يدوياً");
    });
  });
});
