const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load base .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { safeDb } = require('./utils/safeDatabase');

async function main() {
    const companyId = 'cmmhknzdg0000vpy44xp2wf3l'; // Mokhtar Enterprise
    
    console.log('🌱 Creating test product for company:', companyId);
    
    try {
        const product = await safeDb.create('Product', {
            data: {
                name: 'Elite Wireless Headphones V3',
                description: 'Experience premium sound quality with our latest Elite V3 headphones. Featuring active noise cancellation, 40-hour battery life, and ergonomic design.',
                price: 299.99,
                comparePrice: 399.99,
                stock: 50,
                isActive: true,
                isFeatured: true,
                slug: 'elite-wireless-headphones-v3',
                companyId: companyId,
                mainImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop',
                images: JSON.stringify([
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1000&auto=format&fit=crop'
                ]),
                metadata: JSON.stringify({
                    features: ['Active Noise Cancellation', '40h Battery', 'Bluetooth 5.2'],
                    specs: {
                        driver: '40mm Dynamic',
                        frequency: '20Hz - 20kHz',
                        weight: '250g'
                    }
                })
            }
        });
        
        console.log('✅ Product created successfully!');
        console.log('ID:', product.id);
        console.log('Slug:', product.slug);
        
        // Create a variant
        await safeDb.create('ProductVariant', {
            data: {
                productId: product.id,
                name: 'Midnight Black',
                sku: 'EWH-V3-BLK',
                price: 299.99,
                stock: 30,
                isActive: true
            }
        });
        console.log('✅ Variant created!');

    } catch (error) {
        console.error('❌ Error creating product:', error);
    }
}

main()
    .finally(async () => {
        // prisma is handled by safeDb
    });
