import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--window-size=1280,720"]
        )

        context = await browser.new_context()
        page = await context.new_page()

        # 1. Navigate to the storefront with specific layout (Atelier Nova)
        print("Step 1: Navigating to Atelier Nova layout...")
        await page.goto("http://localhost:3000/?layout=atelier-nova&companyId=maxp", wait_until="networkidle")
        
        # 2. Verify Hero section
        print("Step 2: Verifying Hero visibility...")
        await expect(page.get_by_text("Hero", exact=False).first).to_be_visible(timeout=10000)
        
        # 3. Verify Featured Collection
        print("Step 3: Verifying Featured Collection...")
        await expect(page.get_by_text("Featured Collection", exact=False).first).to_be_visible()
        
        # 4. Click on Shop / View Collection link
        print("Step 4: Clicking on Shop CTA...")
        # Search for a link that goes to /shop
        shop_cta = page.locator("a[href*='/shop']").first
        await shop_cta.click()
        
        # 5. Verify navigation to shop page
        print("Step 5: Verifying navigation to shop page...")
        await page.wait_for_url("**/shop**", timeout=10000)
        assert "/shop" in page.url
        
        # 6. Verify collection listing
        print("Step 6: Verifying Collection listing...")
        await expect(page.get_by_text("Collection listing", exact=False).first).to_be_visible()
        
        print("✅ TC002 passed!")

    except Exception as e:
        print(f"❌ TC002 failed: {str(e)}")
        raise e
    finally:
        if context: await context.close()
        if browser: await browser.close()
        if pw: await pw.stop()

if __name__ == "__main__":
    asyncio.run(run_test())
    