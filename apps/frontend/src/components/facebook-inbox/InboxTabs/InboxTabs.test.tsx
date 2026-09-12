import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InboxTabs from "./InboxTabs";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        "inbox.tabs.all": "الكل",
        "inbox.tabs.unreplied": "لم يرد عليها",
        "inbox.tabs.done": "منتهي",
        "inbox.tabs.main": "أساسي",
        "inbox.tabs.general": "عام",
        "inbox.tabs.requests": "طلبات",
        "inbox.tabs.spam": "رسائل مزعجة",
        "inbox.tabs.priority": "الأولوية ⭐",
        "inbox.searchPlaceholder": "بحث...",
      };
      return translations[key] || fallback || key;
    },
  }),
}));

describe("InboxTabs", () => {
  const baseCounts = {
    all: 10,
    unreplied: 3,
    done: 2,
    main: 4,
    general: 1,
    requests: 0,
    spam: 0,
    priority: 2,
  };

  it("renders priority tab next to spam and calls onTabChange with priority when clicked", () => {
    const onTabChange = jest.fn();

    render(
      <InboxTabs
        activeTab="all"
        onTabChange={onTabChange}
        counts={baseCounts}
        onSearch={jest.fn()}
      />
    );

    const priorityTab = screen.getByText("الأولوية ⭐");
    expect(priorityTab).toBeInTheDocument();

    fireEvent.click(priorityTab);
    expect(onTabChange).toHaveBeenCalledWith("priority");
  });

  it("marks priority tab as active when activeTab is priority", () => {
    render(
      <InboxTabs
        activeTab="priority"
        onTabChange={jest.fn()}
        counts={baseCounts}
        onSearch={jest.fn()}
      />
    );

    const priorityTabButton = screen.getByText("الأولوية ⭐").closest("button");
    expect(priorityTabButton).toHaveAttribute("data-active", "true");
  });
});
