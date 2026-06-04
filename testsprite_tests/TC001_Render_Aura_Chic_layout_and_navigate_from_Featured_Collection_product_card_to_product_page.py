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

        # 1. Navigate to the storefront with specific layout
        print("Step 1: Navigating to Aura Chic layout...")
        await page.goto("http://localhost:3000/?layout=aura-chic&companyId=maxp", wait_until="networkidle")
        
        # 2. Verify Hero section
        print("Step 2: Verifying Hero visibility...")
        # Search for Hero text or a section that likely contains it
        await expect(page.get_by_text("Hero", exact=False).first).to_be_visible(timeout=10000)
        
        # 3. Scroll to Featured Collection
        print("Step 3: Scrolling to Featured Collection...")
        featured_section = page.get_by_text("Featured Collection", exact=False).first
        await featured_section.scroll_into_view_if_needed()
        await expect(featured_section).to_be_visible()
        
        # 4. Click on a product card
        print("Step 4: Clicking on product card...")
        # Assuming product cards are links or have a specific structure
        product_card = page.locator("a[href*='/product/']").first
        await product_card.click()
        
        # 5. Verify navigation to product page
        print("Step 5: Verifying navigation to product page...")
        await page.wait_for_url("**/product/**", timeout=10000)
        assert "/product/" in page.url
        
        # 6. Verify product details section
        print("Step 6: Verifying product details...")
        # Wait for either 'Product details' text or common PDP elements
        await expect(page.get_by_text("details", exact=False).first).to_be_visible()
        
        print("✅ TC001 passed!")

    except Exception as e:
        print(f"❌ TC001 failed: {str(e)}")
        # Take a screenshot on failure for debugging if possible (though we are in headless)
        # await page.screenshot(path="tc001_failure.png")
        raise e
    finally:
        if context: await context.close()
        if browser: await browser.close()
        if pw: await pw.stop()

if __name__ == "__main__":
    asyncio.run(run_test())
    