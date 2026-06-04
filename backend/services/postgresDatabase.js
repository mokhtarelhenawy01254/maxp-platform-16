/**
 * PostgreSQL Database Service
 */

let PrismaClient;
try {
    PrismaClient = require('../prisma/generated/postgresql').PrismaClient;
    if (!PrismaClient) throw new Error('Client not found');
} catch (error) {
    try {
        console.log('ℹ️ [PostgresDB] Standard client not found, trying postgresql_v2...');
        PrismaClient = require('../prisma/generated/postgresql_v2').PrismaClient;
    } catch (err2) {
        console.warn('⚠️ [PostgresDB] Prisma client for PostgreSQL not found, skipping...');
        PrismaClient = null;
    }
}

// Global shared instance for PostgreSQL
let postgresPrismaInstance = null;

function createPostgresClient() {
    console.log('🔧 [PostgresDB] Creating stable PrismaClient for PostgreSQL...');

    const databaseUrl = process.env.POSTGRES_URL;
    if (!databaseUrl) {
        console.warn('⚠️ [PostgresDB] POSTGRES_URL not found in environment');
        return null;
    }

    try {
        if (!PrismaClient) {
            console.warn('⚠️ [PostgresDB] Cannot create client: PrismaClient is not loaded');
            return null;
        }
        const client = new PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl
                }
            },
            log: ['error'],
            errorFormat: 'minimal'
        });

        console.log('✅ [PostgresDB] PostgreSQL PrismaClient created successfully');
        return client;
    } catch (error) {
        console.error('❌ [PostgresDB] Failed to create PostgreSQL PrismaClient:', error.message);
        return null;
    }
}

function getPostgresClient() {
    if (!postgresPrismaInstance) {
        postgresPrismaInstance = createPostgresClient();
    }
    return postgresPrismaInstance;
}

// Initial connection test
async function initializePostgresDatabase() {
    const client = getPostgresClient();
    if (!client) return false;

    try {
        await client.$connect();
        // Verify connection with a simple query if possible
        // Note: the model PostgresTest must exist in the schema
        console.log('✅ [PostgresDB] PostgreSQL connection established successfully');
        return true;
    } catch (error) {
        console.error('❌ [PostgresDB] PostgreSQL connection failed:', error.message);
        return false;
    }
}

module.exports = {
    getPostgresClient,
    initializePostgresDatabase,
    postgresPrisma: getPostgresClient()
};
