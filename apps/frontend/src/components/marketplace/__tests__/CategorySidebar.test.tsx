import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategorySidebar } from "../CategorySidebar";
import { groupCategories, categoryGroups, OTHER_CATEGORY_GROUP_ID } from "@/utils/marketplace";
import type { Category } from "@/types/marketplace";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const sampleCategories: Category[] = [
  { category: "ECOMMERCE", name: "التجارة الإلكترونية", nameEn: "E-Commerce", icon: "🛒", count: 13 },
  { category: "CRM", name: "إدارة العملاء", nameEn: "CRM", icon: "📊", count: 4 },
  { category: "MARKETING", name: "التسويق", nameEn: "Marketing", icon: "📣", count: 11 },
  { category: "ANALYTICS", name: "التحليلات", nameEn: "Analytics", icon: "📈", count: 5 },
  { category: "AI", name: "الأتمتة", nameEn: "Automation", icon: "⚙️", count: 4 },
  { category: "MEDICAL", name: "النظام الطبي", nameEn: "Medical", icon: "🏥", count: 1 },
  { category: "UNKNOWN", name: "تصنيف جديد", nameEn: "Unknown", icon: "📦", count: 2 },
];

describe("groupCategories", () => {
  it("groups categories into defined sections plus an other bucket", () => {
    const groups = groupCategories(sampleCategories);
    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(["commerce", "data", "specialized", OTHER_CATEGORY_GROUP_ID]);

    const commerce = groups.find((g) => g.id === "commerce");
    expect(commerce?.items.map((c) => c.category)).toEqual(["ECOMMERCE", "CRM", "MARKETING"]);

    const data = groups.find((g) => g.id === "data");
    expect(data?.items.map((c) => c.category)).toEqual(["ANALYTICS", "AI"]);

    const other = groups.find((g) => g.id === OTHER_CATEGORY_GROUP_ID);
    expect(other?.items.map((c) => c.category)).toEqual(["UNKNOWN"]);
  });

  it("skips empty groups", () => {
    const groups = groupCategories([{ category: "ECOMMERCE", name: "E", nameEn: "E", icon: "🛒", count: 1 }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("commerce");
  });

  it("keeps group definitions stable for known catalog categories", () => {
    const known = categoryGroups.flatMap((g) => g.categories);
    expect(known).toContain("ECOMMERCE");
    expect(known).toContain("MEDICAL");
    expect(known).toContain("PRODUCTIVITY");
  });
});

describe("CategorySidebar", () => {
  it("renders grouped category sections with counts", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText("marketplace.categories.all")).toBeInTheDocument();
    expect(screen.getByText("marketplace.categories.groups.commerce")).toBeInTheDocument();
    expect(screen.getByText("marketplace.categories.groups.data")).toBeInTheDocument();
    expect(screen.getByText("التجارة الإلكترونية")).toBeInTheDocument();
    expect(screen.getByText("التحليلات")).toBeInTheDocument();
    expect(screen.getByText("النظام الطبي")).toBeInTheDocument();
    expect(screen.getByText("تصنيف جديد")).toBeInTheDocument();
  });

  it("shows the total count on the All row", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("calls onSelect('') when clicking All", () => {
    const onSelect = jest.fn();
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("marketplace.categories.all"));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("calls onSelect with the category id when clicking a category", () => {
    const onSelect = jest.fn();
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("التحليلات"));
    expect(onSelect).toHaveBeenCalledWith("ANALYTICS");
  });

  it("collapses a group when its header is clicked", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText("marketplace.categories.groups.data"));
    expect(screen.queryByText("التحليلات")).not.toBeInTheDocument();
    expect(screen.queryByText("الأتمتة")).not.toBeInTheDocument();
  });
});
