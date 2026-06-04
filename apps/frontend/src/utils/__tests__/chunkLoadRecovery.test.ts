import { isChunkLoadError } from "../chunkLoadRecovery";

describe("chunkLoadRecovery", () => {
  it("detects Vite dynamic import fetch failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://maxp.online/assets/SuperAdminUsersManagement-D8Hbzj6W.js",
        ),
      ),
    ).toBe(true);
  });

  it("detects preload and chunk load failures across browsers", () => {
    expect(isChunkLoadError(new Error("vite:preloadError"))).toBe(true);
    expect(isChunkLoadError(new Error("ChunkLoadError: Loading chunk 42 failed"))).toBe(
      true,
    );
    expect(isChunkLoadError("Importing a module script failed.")).toBe(true);
  });

  it("ignores unrelated runtime errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(
      false,
    );
  });
});
