// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import {
  PortalInviteAndPushCard,
  buildParentPortalInviteUrl,
} from "../PortalInviteAndPushCard";

describe("PortalInviteAndPushCard", () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: originalClipboard,
    });
  });

  it("formats parent invite URL with companySlug, customDomain, or fallback /portal-connect", () => {
    const slugUrl = buildParentPortalInviteUrl("swan-academy");
    expect(slugUrl).toMatch(/\/i\/swan-academy\?portal=parent$/);

    const customDomainUrl = buildParentPortalInviteUrl(
      "swan-academy",
      "https://portal.swan.edu/",
    );
    expect(customDomainUrl).toBe(
      "https://portal.swan.edu/i/swan-academy?portal=parent",
    );

    const fallbackUrl = buildParentPortalInviteUrl(null, "school.example.com/");
    expect(fallbackUrl).toBe("https://school.example.com/portal-connect");

    const dentalUrl = buildParentPortalInviteUrl("al-safwa-lab", undefined, "dental");
    expect(dentalUrl).toMatch(/\/i\/al-safwa-lab\?portal=dental$/);
  });

  it("renders dental portal invite URL and title when portal='dental'", () => {
    render(
      <PortalInviteAndPushCard
        portal="dental"
        companySlug="al-safwa-lab"
        publicCode="DENT01"
        pushFirstSaveWhatsApp={true}
        onTogglePushFirst={vi.fn()}
      />,
    );
    expect(screen.getByText("رابط دعوة طبيب الأسنان وإشعارات المعمل")).toBeInTheDocument();
    expect(screen.getByText(/\/i\/al-safwa-lab\?portal=dental/)).toBeInTheDocument();
  });

  it("renders invite URL, publicCode pill, and QR preview cleanly", () => {
    render(
      <PortalInviteAndPushCard
        companySlug="swan"
        publicCode="SWAN01"
        customDomain="https://swan.maxp.online/"
        pushFirstSaveWhatsApp={true}
        onTogglePushFirst={vi.fn()}
      />,
    );

    expect(
      screen.getByText("https://swan.maxp.online/i/swan?portal=parent"),
    ).toBeInTheDocument();
    expect(screen.getByText("SWAN01")).toBeInTheDocument();

    const openLink = screen.getByRole("link", { name: "فتح رابط الدعوة" });
    expect(openLink).toHaveAttribute(
      "href",
      "https://swan.maxp.online/i/swan?portal=parent",
    );
  });

  it("copies invite URL to clipboard and shows copied state", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: writeTextMock },
    });
    const toastSuccessSpy = vi
      .spyOn(toast, "success")
      .mockImplementation(() => "" as never);

    render(
      <PortalInviteAndPushCard
        companySlug="noor"
        customDomain="noor.maxp.online"
        pushFirstSaveWhatsApp={true}
        onTogglePushFirst={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "نسخ رابط الدعوة" }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "https://noor.maxp.online/i/noor?portal=parent",
      );
    });
    expect(screen.getByText("تم النسخ")).toBeInTheDocument();
    expect(toastSuccessSpy).toHaveBeenCalledWith("تم نسخ رابط الدعوة");
  });

  it("invokes onTogglePushFirst with toggled boolean and respects savingPushFirst disabled state", () => {
    const onToggle = vi.fn();
    const view = render(
      <PortalInviteAndPushCard
        companySlug="swan"
        pushFirstSaveWhatsApp={true}
        onTogglePushFirst={onToggle}
        savingPushFirst={false}
      />,
    );

    const toggle = screen.getByRole("switch", {
      name: "إشعارات البوابة أولاً (توفير رسائل واتساب)",
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(false);

    view.rerender(
      <PortalInviteAndPushCard
        companySlug="swan"
        pushFirstSaveWhatsApp={false}
        onTogglePushFirst={onToggle}
        savingPushFirst={true}
        isEn={true}
      />,
    );

    const enToggle = screen.getByRole("switch", {
      name: "Portal Push-First (Save WhatsApp)",
    });
    expect(enToggle).toHaveAttribute("aria-checked", "false");
    expect(enToggle).toBeDisabled();
  });
});
