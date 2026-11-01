/**
 * Regression tests for device classification.
 *
 * الباج الأصلي: getCachedDeviceType() كانت بترجع 'PERSONAL' افتراضياً،
 * و isPersonalDevice() كانت بتستخدم في كتم صوت الإشعارات، فالصوت كان
 * مكتوم على كل الأجهزة لأن مفيش أي كود بيكتب maxp_device_type.
 */
import {
  getCachedDeviceType,
  isExplicitlyPersonalDevice,
  isOfficeDevice,
  isPersonalDevice,
  setCachedDeviceType,
} from "../deviceFingerprint";

// الـ setup العام بيستخدم localStorage وهمي لا يحفظ — نستخدم مخزن حقيقي هنا
const store = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

describe("deviceFingerprint device type", () => {
  beforeEach(() => {
    store.clear();
    Object.defineProperty(global, "localStorage", {
      value: memoryStorage,
      configurable: true,
      writable: true,
    });
  });

  it("treats an unclassified device as PERSONAL for the legacy helpers", () => {
    expect(getCachedDeviceType()).toBe("PERSONAL");
    expect(isPersonalDevice()).toBe(true);
    expect(isOfficeDevice()).toBe(false);
  });

  it("does NOT report an unclassified device as explicitly personal (sound must play)", () => {
    expect(isExplicitlyPersonalDevice()).toBe(false);
  });

  it("reports explicitly PERSONAL devices", () => {
    setCachedDeviceType("PERSONAL");
    expect(isExplicitlyPersonalDevice()).toBe(true);
  });

  it("reports OFFICE devices as not personal", () => {
    setCachedDeviceType("OFFICE");
    expect(isExplicitlyPersonalDevice()).toBe(false);
    expect(isOfficeDevice()).toBe(true);
  });
});
