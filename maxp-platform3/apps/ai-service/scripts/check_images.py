import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='maxp', user='appuser', password='0165676135')
cur = conn.cursor()

cur.execute("""
    SELECT p."companyId", COUNT(*) as total,
           COUNT(p."mainImage") FILTER (WHERE p."mainImage" IS NOT NULL AND p."mainImage" != '') as with_img,
           COUNT(pe."image_embedding") FILTER (WHERE pe."image_embedding" IS NOT NULL) as with_img_emb
    FROM ai.product_embeddings pe
    JOIN public.products p ON p.id = pe.product_id
    GROUP BY p."companyId"
""")
print("Company stats:")
for r in cur.fetchall():
    print(f"  {r[0]}: total={r[1]}, with_image={r[2]}, with_image_embedding={r[3]}")

# Test with dreamer_comp first
cur.execute("""
    SELECT p.name, p."mainImage"
    FROM ai.product_embeddings pe
    JOIN public.products p ON p.id = pe.product_id
    WHERE p."companyId" = 'dreamer_comp' AND p."mainImage" IS NOT NULL AND p."mainImage" != ''
    LIMIT 1
""")
print("\nSample dreamer_comp product with image:")
for r in cur.fetchall():
    print(f"  Name: {r[0]}, MainImage: {r[1]}")

cur.close()
conn.close()
