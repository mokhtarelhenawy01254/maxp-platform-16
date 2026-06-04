require('dotenv').config();
const { Client } = require('pg');

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

async function createTables() {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    console.log('Connected to database');

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.whatsapp_follow_up_flows (
                id TEXT NOT NULL,
                "companyId" TEXT NOT NULL,
                name TEXT NOT NULL,
                "isEnabled" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT whatsapp_follow_up_flows_pkey PRIMARY KEY (id),
                CONSTRAINT whatsapp_follow_up_flows_companyId_fkey FOREIGN KEY ("companyId")
                    REFERENCES public.companies (id) ON DELETE CASCADE
            );
        `);
        console.log('✅ Created whatsapp_follow_up_flows table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS public.whatsapp_follow_up_steps (
                id TEXT NOT NULL,
                "flowId" TEXT NOT NULL,
                "delayDays" INTEGER NOT NULL DEFAULT 1,
                content TEXT NOT NULL,
                "mediaUrl" TEXT,
                "stepOrder" INTEGER NOT NULL DEFAULT 1,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT whatsapp_follow_up_steps_pkey PRIMARY KEY (id),
                CONSTRAINT whatsapp_follow_up_steps_flowId_fkey FOREIGN KEY ("flowId")
                    REFERENCES public.whatsapp_follow_up_flows (id) ON DELETE CASCADE
            );
        `);
        console.log('✅ Created whatsapp_follow_up_steps table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS public.customer_journeys (
                id TEXT NOT NULL,
                "companyId" TEXT NOT NULL,
                "customerId" TEXT NOT NULL,
                "orderId" TEXT,
                "flowId" TEXT NOT NULL,
                "currentStep" INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                "nextSendAt" TIMESTAMP(3) NOT NULL,
                "lastSentAt" TIMESTAMP(3),
                logs TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT customer_journeys_pkey PRIMARY KEY (id),
                CONSTRAINT customer_journeys_companyId_fkey FOREIGN KEY ("companyId")
                    REFERENCES public.companies (id) ON DELETE CASCADE,
                CONSTRAINT customer_journeys_customerId_fkey FOREIGN KEY ("customerId")
                    REFERENCES public.customers (id) ON DELETE CASCADE,
                CONSTRAINT customer_journeys_flowId_fkey FOREIGN KEY ("flowId")
                    REFERENCES public.whatsapp_follow_up_flows (id) ON DELETE CASCADE
            );
        `);
        console.log('✅ Created customer_journeys table');

        await client.query(`
            CREATE INDEX IF NOT EXISTS customer_journeys_companyId_status_nextSendAt_idx
            ON public.customer_journeys ("companyId", status, "nextSendAt");
        `);
        console.log('✅ Created index on customer_journeys');

        console.log('\n🎉 All tables created successfully!');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    } finally {
        await client.end();
    }
}

createTables();
