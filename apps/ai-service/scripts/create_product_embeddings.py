"""
Create ai.product_embeddings table without pgvector dependency.
Stores embeddings as TEXT (JSON arrays) for client-side cosine.
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(
    host="localhost", port=5432, dbname="maxp",
    user="appuser", password="0165676135",
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

cur.execute("CREATE SCHEMA IF NOT EXISTS ai")

cur.execute("""
    CREATE TABLE IF NOT EXISTS ai.product_embeddings (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id      TEXT NOT NULL,
        product_id      TEXT NOT NULL,
        product_name    TEXT NOT NULL,
        sku             TEXT,
        price           NUMERIC,
        status          TEXT DEFAULT 'IN_STOCK',
        text_embedding  TEXT,
        image_embedding TEXT,
        embed_text      TEXT,
        image_url       TEXT,
        description     TEXT,
        tags            TEXT,
        category        TEXT,
        workflow_status TEXT DEFAULT 'PUBLISHED',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")

cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS ix_product_embeddings_company_product
    ON ai.product_embeddings (company_id, product_id)
""")

cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_product_embeddings_company
    ON ai.product_embeddings (company_id)
""")

print("Table and indexes created successfully")
cur.close()
conn.close()
