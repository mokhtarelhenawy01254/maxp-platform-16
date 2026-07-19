const { createRequire } = require("module");
const path = require("path");
const { pathToFileURL } = require("url");

const requireFromFrontend = createRequire("H:/max_p_new/frontend/package.json");
const { chromium } = requireFromFrontend("playwright");

const root = __dirname;
const slicesDir = path.join(root, "slices");

async function waitForPage(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "ar-EG",
  });

  const page = await context.newPage();
  await page.goto(pathToFileURL(path.join(root, "storyboard.html")).href);
  await waitForPage(page);

  const slices = await page.locator(".slice").count();
  for (let index = 0; index < slices; index += 1) {
    const fileName = `slice-${String(index + 1).padStart(2, "0")}.png`;
    await page.locator(".slice").nth(index).screenshot({
      path: path.join(slicesDir, fileName),
    });
  }

  await page.goto(pathToFileURL(path.join(root, "landing.html")).href);
  await waitForPage(page);

  const audit = await page.evaluate(() => {
    const images = Array.from(document.images);
    const fields = Array.from(document.querySelectorAll("input, select, textarea"));
    const targets = Array.from(document.querySelectorAll("button, a, input, select, textarea"));

    const fieldLabel = (field) => {
      if (!field.id) return null;
      return document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    };

    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      imageCount: images.length,
      missingAlt: images.filter((image) => !image.getAttribute("alt")).length,
      missingDimensions: images.filter((image) => !image.getAttribute("width") || !image.getAttribute("height")).length,
      lazyImages: images.filter((image) => image.loading === "lazy").length,
      firstImageLoading: images[0]?.loading || "",
      unlabeledFields: fields.filter((field) => !fieldLabel(field)).length,
      minTargetHeight: Math.min(...targets.map((target) => Math.round(target.getBoundingClientRect().height))),
      formAtBottom: document.querySelector(".order").offsetTop > window.innerHeight,
    };
  });

  await page.screenshot({
    path: path.join(root, "landing-mobile.png"),
  });

  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.floor(window.innerHeight * 0.85);

    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await delay(90);
    }

    await Promise.all(
      Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }),
    );

    window.scrollTo(0, 0);
    await delay(60);
  });

  await page.addStyleTag({
    content: ".sticky-cta{display:none!important} html{scroll-behavior:auto!important}",
  });
  await page.screenshot({
    path: path.join(root, "landing-full.png"),
    fullPage: true,
  });

  await browser.close();
  console.log(JSON.stringify({ slices, audit }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
