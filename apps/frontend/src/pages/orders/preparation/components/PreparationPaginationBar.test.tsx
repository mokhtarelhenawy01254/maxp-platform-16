import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreparationPaginationBar } from "./PreparationPaginationBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("PreparationPaginationBar", () => {
  it("renders pagination page info and controls", () => {
    const onPreviousPage = jest.fn();
    const onNextPage = jest.fn();
    const onPageSizeChange = jest.fn();

    render(
      <PreparationPaginationBar
        page={2}
        totalPages={5}
        currentPageCount={25}
        pageSize={25}
        onPageSizeChange={onPageSizeChange}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
    );

    expect(screen.getByText("الصفحة 2 من 5 (25 طلب)")).toBeInTheDocument();

    const prevBtn = screen.getByText("السابق");
    fireEvent.click(prevBtn);
    expect(onPreviousPage).toHaveBeenCalled();

    const nextBtn = screen.getByText("التالي");
    fireEvent.click(nextBtn);
    expect(onNextPage).toHaveBeenCalled();
  });

  it("disables previous button on first page", () => {
    render(
      <PreparationPaginationBar
        page={1}
        totalPages={5}
        currentPageCount={25}
        pageSize={25}
        onPageSizeChange={jest.fn()}
        onPreviousPage={jest.fn()}
        onNextPage={jest.fn()}
      />
    );

    const prevBtn = screen.getByText("السابق").closest("button");
    expect(prevBtn).toBeDisabled();
  });
});
