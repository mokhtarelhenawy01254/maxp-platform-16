import { describe, expect, it } from "vitest";
import { isSidebarPathActive } from "../matchSidebarPath";

describe("isSidebarPathActive helper", () => {
  it("returns true on exact path matches", () => {
    expect(isSidebarPathActive("/orders", "/orders")).toBe(true);
    expect(isSidebarPathActive("/hr/employees", "/hr/employees")).toBe(true);
  });

  it("returns false on unrelated paths", () => {
    expect(isSidebarPathActive("/orders", "/products")).toBe(false);
  });

  it("returns true on general resource sub-paths", () => {
    expect(isSidebarPathActive("/orders/123", "/orders")).toBe(true);
    expect(isSidebarPathActive("/orders/new", "/orders")).toBe(true);
    expect(isSidebarPathActive("/products/edit/456", "/products")).toBe(true);
  });

  it("returns false on base dashboards sub-paths to prevent duplicate highlighting", () => {
    expect(isSidebarPathActive("/hr/employees", "/hr")).toBe(false);
    expect(isSidebarPathActive("/admin/booking/doctors", "/admin/booking")).toBe(false);
    expect(isSidebarPathActive("/manufacturing/orders", "/manufacturing")).toBe(false);
    expect(isSidebarPathActive("/manufacturing/orders", "/manufacturing/orders")).toBe(true);
    expect(isSidebarPathActive("/manufacturing/orders/123", "/manufacturing/orders")).toBe(true);
    expect(isSidebarPathActive("/accounting/entries", "/accounting")).toBe(false);
    expect(isSidebarPathActive("/settings/store/tools/boughtTogether", "/settings")).toBe(false);
    expect(isSidebarPathActive("/settings/store/tools/boughtTogether", "/settings/store")).toBe(false);
    expect(isSidebarPathActive("/settings/store/tools/boughtTogether", "/settings/store/tools")).toBe(true);
  });

  it("respects search query parameters when present on target", () => {
    expect(isSidebarPathActive("/orders?tab=active", "/orders?tab=active")).toBe(true);
    expect(isSidebarPathActive("/orders?tab=active", "/orders")).toBe(true); // target has no search params, so it matches parent
    expect(isSidebarPathActive("/orders?tab=inactive", "/orders?tab=active")).toBe(false);
  });
});
