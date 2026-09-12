import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InboxTabs from "./InboxTabs";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "inbox.tabs.all": "الكل",
        "inbox.tabs.unreplied": "لم يرد عليها",
        "inbox.tabs.done": "منتهي",
        "inbox.tabs.main": "أساسي",
        "inbox.tabs.general": "عام",
        "inbox.tabs.requests": "طلبات",
        "inbox.tabs.spam": "رسائل مزعجة",
        "inbox.searchPlaceholder": "بحث...",
        "inbox.advancedFilters": "تصفية متقدمة",
      };
      return translations[key] || key;
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

  it("renders priority filter button and calls onTogglePriority when clicked", () => {
    const onTogglePriority = jest.fn();
    const onTabChange = jest.fn();

    render(
      <InboxTabs
        activeTab="all"
        onTabChange={onTabChange}
        counts={baseCounts}
        onSearch={jest.fn()}
        onToggleFilters={jest.fn()}
        isPriorityOnly={false}
        onTogglePriority={onTogglePriority}
        priorityCount={2}
      />
    );

    const priorityButton = screen.getByTitle("تصفية المحادثات ذات الأولوية (⭐) (2)");
    expect(priorityButton).toBeInTheDocument();

    fireEvent.click(priorityButton);
    expect(onTogglePriority).toHaveBeenCalledTimes(1);
  });

  it("shows active title when isPriorityOnly is true", () => {
    render(
      <InboxTabs
        activeTab="all"
        onTabChange={jest.fn()}
        counts={baseCounts}
        onSearch={jest.fn()}
        onToggleFilters={jest.fn()}
        isPriorityOnly={true}
        onTogglePriority={jest.fn()}
        priorityCount={2}
      />
    );

    const priorityButton = screen.getByTitle("إلغاء تصفية الأولوية");
    expect(priorityButton).toBeInTheDocument();
    expect(priorityButton).toHaveClass("bg-amber-500");
  });
});
