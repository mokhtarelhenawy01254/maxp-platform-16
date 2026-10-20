// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrderDetailsNotFound } from "../components/OrderDetailsNotFound";
import { OrderDetails } from "../OrderDetails";
import * as controllerModule from "../hooks/useOrderDetailsController";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
      i18n: { language: "ar" },
    }),
  };
});

afterEach(() => {
  cleanup();
});

describe("OrderDetailsNotFound", () => {
  it("renders order not found message and back button link", () => {
    render(
      <MemoryRouter>
        <OrderDetailsNotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText("الطلب غير موجود")).toBeInTheDocument();
    expect(screen.getByText("العودة إلى قائمة الطلبات")).toBeInTheDocument();
  });
});

describe("OrderDetails", () => {
  it("renders loading state when controller returns loading: true", () => {
    vi.spyOn(controllerModule, "useOrderDetailsController").mockReturnValue({
      loading: true,
      order: null,
    } as unknown as ReturnType<typeof controllerModule.useOrderDetailsController>);

    const { container } = render(
      <MemoryRouter>
        <OrderDetails />
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders not found state when controller returns order: null and loading: false", () => {
    vi.spyOn(controllerModule, "useOrderDetailsController").mockReturnValue({
      loading: false,
      order: null,
    } as unknown as ReturnType<typeof controllerModule.useOrderDetailsController>);

    render(
      <MemoryRouter>
        <OrderDetails />
      </MemoryRouter>,
    );

    expect(screen.getByText("الطلب غير موجود")).toBeInTheDocument();
  });
});
