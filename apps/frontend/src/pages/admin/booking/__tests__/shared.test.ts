import { api, normalizeBranch, tryParseJSON } from "../shared";
import { buildApiUrl } from "../../../../utils/urlHelper";

jest.mock("../../../../utils/urlHelper", () => ({
  buildApiUrl: jest.fn(),
}));

jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true,
  default: { createAuthHeaders: jest.fn(() => ({ "Content-Type": "application/json" })) },
}));

describe("tryParseJSON", () => {
  test("returns null for falsy values", () => {
    expect(tryParseJSON(null)).toBeNull();
    expect(tryParseJSON(undefined)).toBeNull();
    expect(tryParseJSON("")).toBeNull();
  });
  test("returns object as-is for object input", () => {
    const obj = { a: 1 };
    expect(tryParseJSON(obj)).toBe(obj);
  });
  test("parses valid JSON string", () => {
    expect(tryParseJSON('{"a":1}')).toEqual({ a: 1 });
  });
  test("returns null for invalid JSON string", () => {
    expect(tryParseJSON("not-json")).toBeNull();
  });
});

describe("normalizeBranch", () => {
  const base = { id: "1", name: "Test", address: "", phone: "", workStart: "09:00", workEnd: "22:00", isActive: true, createdAt: "2024-01-01" };
  test("parses string workingDays", () => {
    const result = normalizeBranch({ ...base, workingDays: '{"sat":"09:00-22:00"}' });
    expect(typeof result.workingDays).toBe("object");
    expect((result.workingDays as Record<string, string>).sat).toBe("09:00-22:00");
  });
  test("passes through object workingDays", () => {
    const obj = { sat: "09:00-22:00" };
    const result = normalizeBranch({ ...base, workingDays: obj });
    expect(result.workingDays).toBe(obj);
  });
  test("handles undefined genderDays", () => {
    const result = normalizeBranch({ ...base, workingDays: "{}" });
    expect(result.genderDays).toBeUndefined();
  });
});

describe("api", () => {
  test("builds URL with companyId from localStorage", () => {
    (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify({ companyId: "c1" }));
    (buildApiUrl as jest.Mock).mockReturnValue("https://example.com/api/v1/booking/branches");
    const url = api("branches");
    expect(url).toContain("companyId=c1");
  });
});
