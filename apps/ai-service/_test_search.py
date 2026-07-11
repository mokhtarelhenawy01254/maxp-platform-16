import asyncio, base64, httpx, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from src.db.session import init_db
from src.tools.vector_product_search import vector_product_search

async def test():
    await init_db()

    async with httpx.AsyncClient() as client:
        r = await client.get('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400')
        img_bytes = r.content

    print('=== TEXT SEARCH ===')
    results = await vector_product_search(company_id='dreamer_comp', query='تيشيرت قطني', limit=3)
    for r in results:
        print(f'  {r["name"]}: {r["score"]:.2%}')

    print('=== IMAGE SEARCH ===')
    results = await vector_product_search(company_id='dreamer_comp', query='', image_bytes=img_bytes, mime_type='image/jpeg', limit=3, min_score=0.0)
    for r in results:
        print(f'  {r["name"]}: {r["score"]:.2%}')

asyncio.run(test())
