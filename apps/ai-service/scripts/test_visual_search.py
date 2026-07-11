"""
Test visual product search with a real product image.
"""
import asyncio, sys, os
sys.path.insert(0, r'H:\maxp-platform\apps\ai-service')
os.chdir(r'H:\maxp-platform\apps\ai-service')

async def test():
    # Init DB
    from src.db import session as db_mod
    await db_mod.init_db()
    
    # Pick a product with an image from dreamer_comp
    import psycopg2
    conn = psycopg2.connect(host='localhost', port=5432, dbname='maxp', user='appuser', password='0165676135')
    cur = conn.cursor()
    cur.execute("""
        SELECT p.name, p."mainImage"
        FROM ai.product_embeddings pe
        JOIN public.products p ON p.id = pe.product_id
        WHERE p."companyId" = 'dreamer_comp'
          AND p."mainImage" IS NOT NULL
        LIMIT 1
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        print("No product found")
        return
    
    name, img_url = row
    print(f"Testing with: {name}")
    print(f"Image URL: {img_url}")
    
    # Download the image
    import httpx
    async with httpx.AsyncClient(timeout=15, verify=False) as c:
        resp = await c.get(img_url)
        if resp.status_code != 200:
            print(f"Failed to download image: {resp.status_code}")
            return
        img_bytes = resp.content
        mime = resp.headers.get("content-type", "image/jpeg")
        print(f"Downloaded {len(img_bytes)} bytes, mime={mime}")
    
    # Run visual search WITHOUT text query (pure image search)
    from src.tools.vector_product_search import vector_product_search
    results = await vector_product_search(
        company_id='dreamer_comp',
        query='',
        limit=5,
        min_score=0.0,
        image_bytes=img_bytes,
        mime_type=mime,
    )
    
    print(f"\nResults ({len(results)}):")
    for r in results:
        print(f"  {r['name']} | score={r['score']:.4f} ({r['score']*100:.1f}%) | sku={r['sku']}")
    
    # Also test text-only search for the same company
    print(f"\nText-only search for 'تيشيرت قطني':")
    results2 = await vector_product_search(
        company_id='dreamer_comp',
        query='تيشيرت قطني',
        limit=5,
        min_score=0.0,
    )
    for r in results2:
        print(f"  {r['name']} | score={r['score']:.4f} | sku={r['sku']}")

asyncio.run(test())
