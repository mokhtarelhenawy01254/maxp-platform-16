import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='maxp', user='appuser', password='0165676135')
cur = conn.cursor()
cur.execute("""
    SELECT p.name, p.sku, p."mainImage",
           pe."image_embedding" IS NOT NULL AS has_img_emb,
           pe."text_embedding" IS NOT NULL AS has_txt_emb
    FROM ai.product_embeddings pe
    JOIN public.products p ON p.id = pe.product_id
    WHERE pe.company_id = 'cmleybpf70028juo2wwpmp8rt'
""")
for r in cur.fetchall():
    print(f"Name: {r[0]}")
    print(f"SKU: {r[1]}")
    print(f"MainImage: {r[2]}")
    print(f"Image Embedding: {'YES' if r[3] else 'NO'}")
    print(f"Text Embedding: {'YES' if r[4] else 'NO'}")
cur.close()
conn.close()
