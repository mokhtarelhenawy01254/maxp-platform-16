import fs from "fs";
import path from "path";

describe("index.html chunk recovery bootstrap", () => {
  const indexHtml = fs.readFileSync(
    path.resolve(__dirname, "../../../index.html"),
    "utf8",
  );

  it("installs early chunk recovery before the Vite module entrypoint", () => {
    const recoveryScriptIndex = indexHtml.indexOf("maxp-early-chunk-recovery");
    const moduleEntrypointIndex = indexHtml.indexOf('src="/src/main.tsx"');

    expect(recoveryScriptIndex).toBeGreaterThanOrEqual(0);
    expect(moduleEntrypointIndex).toBeGreaterThanOrEqual(0);
    expect(recoveryScriptIndex).toBeLessThan(moduleEntrypointIndex);
  });

  it("detects Chrome cache read failures for Vite dependency chunks", () => {
    expect(indexHtml.toLowerCase()).toContain("err_cache_read_failure");
    expect(indexHtml).toContain("node_modules/.vite/deps/chunk-");
  });
});
