const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

const USER = {
  id: "cmlc7qufe0003ju40bgjv7lp2",
  email: "alpha@h2m.com",
  firstName: "Alpha",
  lastName: "Owner",
  companyId: "cmlc7quet0000ju403h74m5o9",
  role: "OWNER"
};

const mockProducts = [
  {
    id: "prod-1",
    name: "قميص كاجوال كلاسيك مميز جداً متوفر بجميع المقاسات والألوان",
    price: 350,
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300"],
    category: "ملابس رجالي",
    stock: 25,
    status: "AVAILABLE",
    hasVariants: false,
    variants: []
  },
  {
    id: "prod-2",
    name: "بنطلون جينز أزرق داكن خامة ممتازة",
    price: 450,
    images: ["https://images.unsplash.com/photo-1542272604-780c96856592?w=300"],
    category: "ملابس رجالي",
    stock: 12,
    status: "AVAILABLE",
    hasVariants: false,
    variants: []
  },
  {
    id: "prod-3",
    name: "حذاء رياضي مريح للجري والتمارين",
    price: 590,
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300"],
    category: "أحذية",
    stock: 8,
    status: "AVAILABLE",
    hasVariants: false,
    variants: []
  },
  {
    id: "prod-4",
    name: "ساعة يد أنيقة ضد الماء",
    price: 890,
    images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=300"],
    category: "إكسسوارات",
    stock: 15,
    status: "AVAILABLE",
    hasVariants: false,
    variants: []
  }
];

const mockConversations = [
  {
    id: "conv-101",
    contactName: "أحمد محمود",
    contactPhone: "01012345678",
    customer: {
      id: "cust-1",
      name: "أحمد محمود",
      phone: "01012345678"
    },
    platform: "whatsapp",
    status: "ACTIVE",
    lastMessage: "أريد عمل طلب سريع للمنتجات المتاحة",
    unreadCount: 0,
    updatedAt: new Date().toISOString()
  }
];

async function run() {
  console.log("Launching browser with mobile emulation (390x844)...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-quick-order-profile-mocked"
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");

    console.log("Setting local auth...");
    await page.goto("http://localhost:3005/login", { waitUntil: "domcontentloaded" });
    await page.evaluate((user) => {
      const mockToken = "mock-token-123";
      localStorage.setItem("token", mockToken);
      localStorage.setItem("accessToken", mockToken);
      sessionStorage.setItem("accessToken", mockToken);
      sessionStorage.setItem("token", mockToken);
      localStorage.setItem("user", JSON.stringify(user));
    }, USER);

    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (url.includes('/api/v1/auth/me')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: USER })
        });
      } else if (url.includes('/api/v1/products')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockProducts, products: mockProducts })
        });
      } else if (url.includes('/api/v1/conversations') || url.includes('/api/v1/facebook-inbox') || url.includes('/api/v1/whatsapp-inbox')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockConversations, conversations: mockConversations })
        });
      } else if (url.includes('/api/v1/governorates') || url.includes('/api/v1/shipping')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [{ id: "gov-1", name: "القاهرة", price: 50 }] })
        });
      } else {
        req.continue();
      }
    });

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

    console.log("Navigating to http://localhost:3005/facebook-inbox...");
    await page.goto("http://localhost:3005/facebook-inbox", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log("Clicking conversation...");
    await page.evaluate(() => {
      const card = document.querySelector('div.cursor-pointer, [class*="conversation"], [class*="contact"]');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log("Clicking quick order button...");
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const btn of btns) {
        const text = (btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.innerText || '');
        if (text.includes('طلب سريع') || text.includes('إنشاء طلب') || text.includes('طلب')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Order button clicked:", clicked);
    await new Promise(r => setTimeout(r, 4000));

    const screenshotPath = path.join(artifactsDir, "quick_order_mobile_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved quick_order_mobile_verified.png screenshot.");

  } catch (err) {
    console.error("Mocked test error:", err);
  } finally {
    await browser.close();
  }
}

run();
