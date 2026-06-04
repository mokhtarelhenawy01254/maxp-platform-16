const { getSharedPrismaClient } = require('../services/sharedDatabase');
const postgresVectorService = require('../services/postgresVectorService');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function syncData() {
    console.log('ðŸ”„ Starting Data Sync: MySQL -> PostgreSQL...');

    const mysql = getSharedPrismaClient();

    try {
        // 1. Fetch all active products from MySQL
        const products = await mysql.product.findMany({
            where: { isActive: true },
            include: { category: true }
        });

        console.log(`ðŸ“¦ Found ${products.length} products to sync`);

        // 2. Sync each product
        for (const product of products) {
            try {
                // Parse embedding if exists
                let embedding = null;
                if (product.embedding) {
                    try {
                        embedding = typeof product.embedding === 'string'
                            ? JSON.parse(product.embedding)
                            : product.embedding;
                    } catch (e) {
                        console.warn(`âš ï¸ [SYNC] Failed to parse embedding for product ${product.id}`);
                    }
                }

                // Use postgresVectorService to upsert
                await postgresVectorService.upsertProduct({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    categoryId: product.categoryId,
                    isActive: product.isActive,
                    embedding: embedding
                }, product.companyId);

            } catch (err) {
                console.error(`âŒ [SYNC] Failed to sync product ${product.id}:`, err.message);
            }
        }

        console.log('âœ… Data Sync Completed!');

    } catch (err) {
        console.error('âŒ Sync Failed:', err.message);
    } finally {
        await postgresVectorService.close();
        process.exit(0);
    }
}

syncData();

