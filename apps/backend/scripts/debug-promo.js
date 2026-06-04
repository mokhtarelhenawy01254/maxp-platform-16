
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPromotion() {
    const id = 'cmlgwo97o000jvb1k9jo0yyeo';
    try {
        const promotion = await prisma.promotion.findUnique({
            where: { id }
        });
        if (promotion) {
            console.log('✅ Promotion found:', JSON.stringify(promotion, null, 2));
        } else {
            console.log('❌ Promotion not found:', id);
            // Check if it exists with another company or just search all
            const anyPromotion = await prisma.promotion.findFirst({
                where: { id }
            });
            console.log('Any search result:', anyPromotion ? 'Found' : 'Not Found');
        }
    } catch (error) {
        console.error('Error checking promotion:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPromotion();
