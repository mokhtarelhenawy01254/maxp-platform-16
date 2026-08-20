const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load base .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Load .env.local if exists
const localEnvPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
}

// Load .env.production if NODE_ENV is production
if (process.env.NODE_ENV === 'production') {
    const prodEnvPath = path.resolve(__dirname, '.env.production');
    if (fs.existsSync(prodEnvPath)) {
        dotenv.config({ path: prodEnvPath, override: true });
    }
}

const { safeDb } = require('./utils/safeDatabase');

async function main() {
    const p = await safeDb.findFirst('Product', {
        select: { id: true, companyId: true, name: true }
    });
    if (p) {
        console.log('--- PRODUCT DATA ---');
        console.log(JSON.stringify(p, null, 2));
    } else {
        console.log('No products found');
    }
}

main()
    .finally(async () => {
        // prisma is handled by safeDb
    });
