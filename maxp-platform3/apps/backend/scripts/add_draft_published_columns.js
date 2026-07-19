const { Client } = require('pg');
require('dotenv').config();

async function updateSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        // Add draftContent column
        try {
            await client.query('ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "draftContent" JSONB;');
            console.log('Added draftContent column');
        } catch (e) { console.error('Error adding draftContent:', e.message); }

        // Add publishedContent column
        try {
            await client.query('ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "publishedContent" JSONB;');
            console.log('Added publishedContent column');
        } catch (e) { console.error('Error adding publishedContent:', e.message); }

        // Add version column
        try {
            await client.query('ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;');
            console.log('Added version column');
        } catch (e) { console.error('Error adding version:', e.message); }

        // Add lastPublishedAt column
        try {
            await client.query('ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "lastPublishedAt" TIMESTAMP WITH TIME ZONE;');
            console.log('Added lastPublishedAt column');
        } catch (e) { console.error('Error adding lastPublishedAt:', e.message); }

        console.log('Schema update completed successfully');
    } catch (err) {
        console.error('Schema update failed:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
