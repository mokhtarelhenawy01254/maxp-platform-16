const { Client } = require('pg');

async function main() {
    const client = new Client({ 
        connectionString: 'postgresql://u339372869_max:0165676135Aa%40A@92.113.22.70:5432/u339372869_max',
        connectionTimeoutMillis: 15000
    });
    
    try {
        await client.connect();
        console.log('Connected to remote PostgreSQL!');

        // 1. Get Swan company details
        const companyRes = await client.query("SELECT id, name, slug FROM companies WHERE slug = 'swan' OR name ILIKE '%swan%'");
        if (companyRes.rows.length === 0) {
            console.log('❌ Swan company not found in production.');
            await client.end();
            return;
        }

        const swan = companyRes.rows[0];
        console.log(`🏢 Found Company: ${swan.name} (Slug: ${swan.slug}, ID: ${swan.id})`);

        // 2. Query products for Swan
        const productsRes = await client.query(`
            SELECT id, name, sku, price, "isActive", "deletedAt", tags, 
                   embedding IS NOT NULL as has_text_embedding,
                   "embeddingImage" IS NOT NULL as has_image_embedding
            FROM products 
            WHERE "companyId" = $1
        `, [swan.id]);

        console.log(`📦 Found ${productsRes.rows.length} products for Swan in production:`);
        for (const p of productsRes.rows) {
            console.log(`- Product Name: "${p.name}"`);
            console.log(`  SKU: ${p.sku}`);
            console.log(`  Price: ${p.price}`);
            console.log(`  Active: ${p.isActive}`);
            console.log(`  DeletedAt: ${p.deletedAt}`);
            console.log(`  Tags: ${p.tags}`);
            console.log(`  Has Text Embedding: ${p.has_text_embedding}`);
            console.log(`  Has Image Embedding: ${p.has_image_embedding}`);

            // Get variants
            const variantsRes = await client.query('SELECT name, type, sku, stock, "isActive" FROM product_variants WHERE "productId" = $1', [p.id]);
            console.log(`  Variants count: ${variantsRes.rows.length}`);
            for (const v of variantsRes.rows) {
                console.log(`    * Variant: ${v.name} (Type: ${v.type}, SKU: ${v.sku}, Stock: ${v.stock}, Active: ${v.isActive})`);
            }
            console.log('-------------------------------------------');
        }

        // 3. Check AI product embeddings table
        const aiEmbeddingsRes = await client.query(`
            SELECT COUNT(*)::int as count 
            FROM ai.product_embeddings 
            WHERE company_id = $1
        `, [swan.id]).catch(e => {
            console.log('⚠️ Could not query ai.product_embeddings:', e.message);
            return { rows: [] };
        });
        if (aiEmbeddingsRes.rows.length > 0) {
            console.log(`📊 ai.product_embeddings count for Swan: ${aiEmbeddingsRes.rows[0].count}`);
        }

        await client.end();
    } catch(e) {
        console.log('Connection failed:', e.message);
    }
}

main();
