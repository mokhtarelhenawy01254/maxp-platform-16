import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(__dirname, "../apps/frontend/package.json"));
const { chromium } = require("playwright");

const cssPath = path.resolve(__dirname, "../apps/frontend/src/storefront/styles/storefront-animations.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

async function runGateCheck(runIndex) {
  console.log(`\n============================================================`);
  console.log(`▶ ANIM-2 ACCEPTANCE GATE — RUN #${runIndex}`);
  console.log(`============================================================`);

  const browser = await chromium.launch({ headless: true });

  // ─────────────────────────────────────────────────────────────
  // PART 1: Live Physics & Frame Measurement of Entrance Animations
  // ─────────────────────────────────────────────────────────────
  console.log("\n[GATE PART 1] Live Frame & Transition Measurement (All 4 Types)");
  const animContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const animPage = await animContext.newPage();

  const testHtml = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; padding: 0; font-family: sans-serif; }
          .sec { height: 350px; margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; }
          ${cssContent}
        </style>
      </head>
      <body>
        <div id="sec-fade" data-storefront-section="true" data-anim-in="fade" class="sec sf-anim-entrance">Fade</div>
        <div id="sec-slide-up" data-storefront-section="true" data-anim-in="slide-up" class="sec sf-anim-entrance">Slide Up</div>
        <div id="sec-slide-right" data-storefront-section="true" data-anim-in="slide-right" class="sec sf-anim-entrance">Slide Right</div>
        <div id="sec-zoom" data-storefront-section="true" data-anim-in="zoom" class="sec sf-anim-entrance">Zoom</div>
      </body>
    </html>
  `;

  await animPage.setContent(testHtml);

  const getComputed = async (sel) => {
    return await animPage.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const c = window.getComputedStyle(el);
      return {
        opacity: parseFloat(c.opacity),
        opacityRaw: c.opacity,
        transform: c.transform,
        transitionDuration: c.transitionDuration,
        classList: Array.from(el.classList),
      };
    }, sel);
  };

  const animTypes = [
    { id: "#sec-fade", type: "fade" },
    { id: "#sec-slide-up", type: "slide-up" },
    { id: "#sec-slide-right", type: "slide-right" },
    { id: "#sec-zoom", type: "zoom" },
  ];

  // 1a. Fail-Open Verification (Initial state BEFORE JS arms)
  for (const { id, type } of animTypes) {
    const init = await getComputed(id);
    if (init.opacity !== 1) {
      throw new Error(`FAIL-OPEN VIOLATION: ${id} (${type}) has initial opacity ${init.opacity} !== 1`);
    }
    console.log(`  ✓ ${type}: Safe-by-default initial opacity = ${init.opacity} (100% visible before JS arms)`);
  }

  // 1b. Arming below the fold (Simulating JS scroll arming)
  await animPage.evaluate(() => {
    for (const el of document.querySelectorAll("[data-anim-in]")) {
      el.classList.add("sf-anim-armed");
    }
  });

  for (const { id, type } of animTypes) {
    const armed = await getComputed(id);
    if (armed.opacity !== 0) {
      throw new Error(`ARMING FAILURE: ${id} (${type}) has armed opacity ${armed.opacity} !== 0`);
    }
    console.log(`  ✓ ${type}: Armed offscreen opacity = ${armed.opacity}, transform = ${armed.transform}`);
  }

  // 1c. Live Reveal Measurement (Sampling opacity transition frames)
  console.log("  Measuring live transition frames (0ms -> 150ms -> 300ms -> 650ms)...");
  await animPage.evaluate(() => {
    for (const el of document.querySelectorAll("[data-anim-in]")) {
      el.classList.remove("sf-anim-armed");
      el.classList.add("is-visible");
    }
  });

  const startTime = Date.now();
  const frameSamples = [];
  for (const delay of [0, 150, 300, 650]) {
    if (delay > 0) {
      const wait = delay - (Date.now() - startTime);
      if (wait > 0) await animPage.waitForTimeout(wait);
    }
    const current = await getComputed("#sec-slide-up");
    frameSamples.push({
      targetDelay: delay,
      elapsed: Date.now() - startTime,
      opacity: current.opacity,
      transform: current.transform,
    });
  }

  for (const f of frameSamples) {
    console.log(`    frame @ ~${f.targetDelay}ms (elapsed: ${f.elapsed}ms): opacity = ${f.opacity}, transform = ${f.transform}`);
  }

  const firstFrame = frameSamples[0];
  const midFrame = frameSamples[1];
  const finalFrame = frameSamples[frameSamples.length - 1];

  if (firstFrame.opacity > 0.3) {
    throw new Error(`ANIMATION FAILURE: Opacity did not start at 0 (started at ${firstFrame.opacity})`);
  }
  if (midFrame.opacity <= firstFrame.opacity || midFrame.opacity >= 1) {
    throw new Error(`ANIMATION FAILURE: Mid-transition opacity ${midFrame.opacity} is not progressing smoothly`);
  }
  if (finalFrame.opacity !== 1) {
    throw new Error(`ANIMATION FAILURE: Final opacity is ${finalFrame.opacity} !== 1`);
  }
  console.log(`  ✓ Motion verified: Opacity started at ${firstFrame.opacity} and smoothly reached ${finalFrame.opacity} over 600ms.`);
  await animContext.close();

  // ─────────────────────────────────────────────────────────────
  // PART 2: prefers-reduced-motion: reduce
  // ─────────────────────────────────────────────────────────────
  console.log("\n[GATE PART 2] Reduced Motion Compliance (prefers-reduced-motion: reduce)");
  const rmContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const rmPage = await rmContext.newPage();
  await rmPage.setContent(testHtml);

  // Even when armed class is added, reduced-motion must enforce opacity=1, transition=0s
  await rmPage.evaluate(() => {
    for (const el of document.querySelectorAll("[data-anim-in]")) {
      el.classList.add("sf-anim-armed");
    }
  });

  for (const { id, type } of animTypes) {
    const rmComputed = await rmPage.evaluate((s) => {
      const el = document.querySelector(s);
      const c = window.getComputedStyle(el);
      return {
        opacity: parseFloat(c.opacity),
        transitionDuration: c.transitionDuration,
        transform: c.transform,
      };
    }, id);

    if (rmComputed.opacity !== 1 || rmComputed.transitionDuration !== "0s" || rmComputed.transform !== "none") {
      throw new Error(`REDUCED MOTION FAILURE: ${id} (${type}) expected opacity=1, duration=0s, transform=none, got ${JSON.stringify(rmComputed)}`);
    }
    console.log(`  ✓ ${type}: reduced-motion strictly enforced (opacity=${rmComputed.opacity}, transitionDuration=${rmComputed.transitionDuration}, transform=${rmComputed.transform})`);
  }
  await rmContext.close();

  // ─────────────────────────────────────────────────────────────
  // PART 3: Live Storefront Sections Across 2 Themes
  // ─────────────────────────────────────────────────────────────
  console.log("\n[GATE PART 3] Live Storefront Sections Verification Across 2 Themes");
  const themesToTest = [
    { id: "clean-standard", name: "Clean Standard" },
    { id: "khemet-luxe-eg", name: "Khemet Luxe" },
  ];

  for (const t of themesToTest) {
    console.log(`  Testing theme [${t.name}] (${t.id})...`);
    const storeContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const storePage = await storeContext.newPage();

    // Mock API endpoints
    await storePage.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.includes("storefront-settings/public") || url.includes("storefront/settings")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              themeId: t.id,
              companyName: "متجر التجربة",
              storefront: { themeId: t.id },
            },
          }),
        });
      }
      if (url.includes("products")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { products: [], total: 0 } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await storePage.goto(`http://127.0.0.1:5174/?previewTheme=${t.id}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for storefront engine to mount
    await storePage.waitForSelector("#storefront-engine-root", { state: "attached", timeout: 25000 });
    await storePage.waitForTimeout(3000);

    // Scroll through the entire page to trigger intersection observers
    await storePage.evaluate(async () => {
      const scrollStep = 400;
      const maxScroll = document.body.scrollHeight;
      for (let y = 0; y <= maxScroll; y += scrollStep) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });

    // Allow animation fallbacks/settling
    await storePage.waitForTimeout(1400);

    const sections = await storePage.evaluate(() => {
      const els = Array.from(document.querySelectorAll("[data-storefront-section='true']"));
      return els.map((el, idx) => {
        const c = window.getComputedStyle(el);
        return {
          index: idx,
          type: el.getAttribute("data-section-type"),
          opacity: parseFloat(c.opacity),
          display: c.display,
          visibility: c.visibility,
          classList: Array.from(el.classList),
          animIn: el.getAttribute("data-anim-in"),
        };
      });
    });

    const hiddenSections = sections.filter((s) => s.opacity === 0 || s.display === "none" || s.visibility === "hidden");
    console.log(`    Total sections: ${sections.length}`);
    console.log(`    Hidden sections: ${hiddenSections.length}`);

    if (sections.length === 0) {
      throw new Error(`THEME VERIFICATION FAILURE: Zero sections rendered for theme ${t.name}`);
    }
    if (hiddenSections.length > 0) {
      throw new Error(`THEME VERIFICATION FAILURE: ${hiddenSections.length} section(s) hidden in theme ${t.name}!`);
    }

    console.log(`    ✓ Theme [${t.name}]: All ${sections.length}/${sections.length} sections visible (hidden == 0).`);
    await storeContext.close();
  }

  await browser.close();
  console.log(`\n🎉 RUN #${runIndex} PASSED 100% CLEANLY WITH ZERO FAILURES!`);
  return true;
}

async function main() {
  console.log("============================================================");
  console.log("ANIM-2 ACCEPTANCE PROTOCOL — MANDATORY 2 CONSECUTIVE PASSES");
  console.log("============================================================");

  // Run 1
  await runGateCheck(1);

  // Short pause
  await new Promise((r) => setTimeout(r, 1000));

  // Run 2
  await runGateCheck(2);

  console.log("\n============================================================");
  console.log("✅ ACCEPTANCE GATE: 2 CONSECUTIVE PASSES COMPLETED (PASS/PASS)");
  console.log("All criteria fulfilled: hidden==0, motion verified, reduced-motion compliance.");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("\n❌ ACCEPTANCE GATE FAILED:", err);
  process.exit(1);
});
