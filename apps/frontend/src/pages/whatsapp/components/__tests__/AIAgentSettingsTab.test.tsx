import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../../../services/whatsappAI", () => ({
  whatsappAIService: {
    list: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    bulkAdd: jest.fn(),
    stats: jest.fn(),
  },
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    "common.loading": "Loading…",
    "common.cancel": "Cancel",
    "common.save": "Save",
  };
  return map[key] || key;
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: "en" } }),
}));

import AIAgentSettingsTab from "../AIAgentSettingsTab";
import { whatsappAIService } from "../../../services/whatsappAI";

const typedService = whatsappAIService as unknown as {
  list: jest.Mock;
  add: jest.Mock;
  bulkAdd: jest.Mock;
  remove: jest.Mock;
  stats: jest.Mock;
};

const sampleEntry = {
  id: "entry-1",
  companyId: "co-1",
  phoneNumber: "201001234567",
  label: "Mokhtar (CEO)",
  notes: null,
  addedByUserId: "u-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("AIAgentSettingsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders empty state when list is empty", async () => {
    typedService.list.mockResolvedValue([]);
    typedService.stats.mockResolvedValue({
      total: 0,
      skippedToday: 0,
      skippedThisWeek: 0,
      skippedAllTime: 0,
    });

    renderWithQuery(<AIAgentSettingsTab companyId="co-1" />);

    await waitFor(() => {
      expect(typedService.list).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/no numbers on the list yet/i),
    ).toBeInTheDocument();
  });

  test("renders existing entries from API", async () => {
    typedService.list.mockResolvedValue([sampleEntry]);
    typedService.stats.mockResolvedValue({
      total: 1,
      skippedToday: 0,
      skippedThisWeek: 0,
      skippedAllTime: 0,
    });

    renderWithQuery(<AIAgentSettingsTab companyId="co-1" />);

    expect(await screen.findByText("+201001234567")).toBeInTheDocument();
    expect(screen.getByText("Mokhtar (CEO)")).toBeInTheDocument();
  });

  test("opens add dialog and submits a new entry", async () => {
    typedService.list.mockResolvedValueOnce([]);
    typedService.stats.mockResolvedValue({
      total: 0,
      skippedToday: 0,
      skippedThisWeek: 0,
      skippedAllTime: 0,
    });
    typedService.add.mockResolvedValue(sampleEntry);

    const user = userEvent.setup();
    renderWithQuery(<AIAgentSettingsTab companyId="co-1" />);

    await waitFor(() => expect(typedService.list).toHaveBeenCalled());

    const addBtn = await screen.findByRole("button", { name: /add number/i });
    await user.click(addBtn);

    const phoneInput = await screen.findByPlaceholderText(/\+20 100/);
    await user.type(phoneInput, "+20 100 123 4567");

    const saveBtn = screen.getByRole("button", { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(typedService.add).toHaveBeenCalledWith(
        "co-1",
        "+20 100 123 4567",
        undefined,
        undefined,
      );
    });
  });

  test("bulk import parses phone + label lines", async () => {
    typedService.list.mockResolvedValue([]);
    typedService.stats.mockResolvedValue({
      total: 0,
      skippedToday: 0,
      skippedThisWeek: 0,
      skippedAllTime: 0,
    });
    typedService.bulkAdd.mockResolvedValue({
      inserted: 2,
      skipped: 0,
      entries: [sampleEntry],
    });

    const user = userEvent.setup();
    renderWithQuery(<AIAgentSettingsTab companyId="co-1" />);

    await waitFor(() => expect(typedService.list).toHaveBeenCalled());

    const bulkBtn = await screen.findByRole("button", {
      name: /bulk import/i,
    });
    await user.click(bulkBtn);

    const textarea = await screen.findByRole("textbox");
    await user.type(
      textarea,
      "+201001234567, Mokhtar (CEO){enter}+201119876543, QA",
    );

    const importBtn = screen.getByRole("button", { name: /import 2/i });
    await user.click(importBtn);

    await waitFor(() => {
      expect(typedService.bulkAdd).toHaveBeenCalledWith([
        {
          companyId: "co-1",
          phoneNumber: "+201001234567",
          label: "Mokhtar (CEO)",
        },
        { companyId: "co-1", phoneNumber: "+201119876543", label: "QA" },
      ]);
    });
  });

  test("removing an entry calls remove with correct id", async () => {
    typedService.list.mockResolvedValue([sampleEntry]);
    typedService.stats.mockResolvedValue({
      total: 1,
      skippedToday: 0,
      skippedThisWeek: 0,
      skippedAllTime: 0,
    });
    typedService.remove.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderWithQuery(<AIAgentSettingsTab companyId="co-1" />);

    const removeBtn = await screen.findByRole("button", { name: /remove/i });
    await user.click(removeBtn);

    const confirmBtn = await screen.findByRole("button", { name: /remove/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(typedService.remove).toHaveBeenCalledWith("entry-1", "co-1");
    });
  });
});
