import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategorySidebar } from "../CategorySidebar";
import { groupCategoriesByHub } from "@/utils/marketplaceSystems";
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
  { category: "AI", name: "الذكاء الاصطناعي", nameEn: "AI", icon: "🧠", count: 4 },
  { category: "MEDICAL", name: "النظام الطبي", nameEn: "Medical", icon: "🏥", count: 1 },
  { category: "UNKNOWN", name: "تصنيف جديد", nameEn: "Unknown", icon: "📦", count: 2 },
];

describe("groupCategoriesByHub", () => {
  it("groups categories under their system hubs in hub order", () => {
    const groups = groupCategoriesByHub(sampleCategories);
    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(["COMMERCE", "MEDICAL", "AI_COMMUNICATION", "OPERATIONS_FINANCE", "MARKETING_GROWTH"]);

    const commerce = groups.find((g) => g.id === "COMMERCE");
    expect(commerce?.items.map((c) => c.category)).toEqual(["ECOMMERCE", "UNKNOWN"]);
    expect(commerce?.labelKey).toBe("التجارة والتجزئة");

    const marketing = groups.find((g) => g.id === "MARKETING_GROWTH");
    expect(marketing?.items.map((c) => c.category)).toEqual(["CRM", "MARKETING"]);
  });

  it("skips hubs with no categories", () => {
    const groups = groupCategoriesByHub([{ category: "ECOMMERCE", name: "E", nameEn: "E", icon: "🛒", count: 1 }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("COMMERCE");
  });

  it("maps unknown categories to the commerce fallback hub", () => {
    const groups = groupCategoriesByHub([{ category: "SOMETHING_NEW", name: "N", nameEn: "N", icon: "📦", count: 1 }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("COMMERCE");
  });
});

describe("CategorySidebar", () => {
  it("renders hub-grouped category sections with counts", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText("marketplace.categories.all")).toBeInTheDocument();
    expect(screen.getByText("التجارة والتجزئة")).toBeInTheDocument();
    expect(screen.getByText("الذكاء الاصطناعي والمراسلات")).toBeInTheDocument();
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

  it("collapses a hub group when its header is clicked", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText("العمليات والـ HR والمالية"));
    expect(screen.queryByText("التحليلات")).not.toBeInTheDocument();
    expect(screen.queryByText("الذكاء الاصطناعي")).toBeInTheDocument();
  });
});
