import { clearAllSWCaches, flushSWCacheAndReload } from "../swCacheFlush";

describe("swCacheFlush", () => {
  const originalCaches = window.caches;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: originalCaches,
    });
  });

  it("clears all cache keys from window.caches", async () => {
    const deleteMock = jest.fn().mockResolvedValue(true);
    const keysMock = jest.fn().mockResolvedValue(["pages-v1", "assets-v1"]);

    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: {
        keys: keysMock,
        delete: deleteMock,
      },
    });

    const result = await clearAllSWCaches();
    expect(result).toBe(true);
    expect(keysMock).toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledWith("pages-v1");
    expect(deleteMock).toHaveBeenCalledWith("assets-v1");
  });

  it("flushSWCacheAndReload triggers cache clear and reloads window location", async () => {
    const deleteMock = jest.fn().mockResolvedValue(true);
    const keysMock = jest.fn().mockResolvedValue(["test-cache"]);
    const reloadMock = jest.fn();

    Object.defineProperty(window, "caches", {
      configurable: true,
      writable: true,
      value: {
        keys: keysMock,
        delete: deleteMock,
      },
    });

    const originalLocation = window.location;
    // @ts-expect-error mocking window.location
    delete window.location;
    window.location = { ...originalLocation, reload: reloadMock };

    await flushSWCacheAndReload();

    expect(deleteMock).toHaveBeenCalledWith("test-cache");
    expect(reloadMock).toHaveBeenCalled();

    window.location = originalLocation;
  });
});
