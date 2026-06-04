const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const targetPageId = process.argv[2];

async function run() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to initialize Prisma client');
        process.exit(1);
    }

    try {
        const where = targetPageId ? { pageId: targetPageId } : { status: 'connected' };

        const pages = await prisma.facebookPage.findMany({
            where: where,
            select: {
                id: true,
                pageId: true,
                pageName: true,
                pageAccessToken: true,
                companyId: true,
                status: true
            }
        });

        console.log(`Found ${pages.length} records matching search.`);

        for (const page of pages) {
            console.log(`\nðŸ” Checking Page: ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
            if (!page.pageAccessToken) {
                console.log('âš ï¸ No access token found in database.');
                continue;
            }
            try {
                const response = await axios.get(`https://graph.facebook.com/v18.0/${page.pageId}/subscribed_apps`, {
                    params: {
                        access_token: page.pageAccessToken
                    }
                });
                console.log('âœ… Subscription Status:', JSON.stringify(response.data, null, 2));
            } catch (fbError) {
                console.error('âŒ Facebook API Error:', fbError.response?.data?.error?.message || fbError.message);
                if (fbError.response?.data?.error?.code === 190) {
                    console.log('ðŸ’¡ Tip: The Page Access Token is likely expired or invalid.');
                }
            }
        }

    } catch (error) {
        console.error('Database query error:', error.message);
    } finally {
        process.exit(0);
    }
}

run();

