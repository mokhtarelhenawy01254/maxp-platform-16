const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();

    console.log('🔍 Searching for Company with Red Sea zone...');

    // Find company that has a zone with name containing 'البحر' or 'Red'
    const zones = await prisma.shippingZone.findMany({
        where: {
            OR: [
                { name: { contains: 'البحر' } },
                { name: { contains: 'Red' } },
                { governorates: { contains: 'البحر' } },
                { governorates: { contains: 'Red' } }
            ]
        },
        include: { company: true }
    });

    if (zones.length === 0) {
        console.log('❌ No company found with Red Sea zones.');
        // Fallback to listing all companies
        const companies = await prisma.company.findMany({ take: 5 });
        console.log('Available Companies:', companies.map(c => `${c.id} (${c.name})`));
        return;
    }

    const targetCompanyId = zones[0].companyId;
    const targetCompanyName = zones[0].company.name;
    console.log(`✅ Found Target Company: ${targetCompanyId} (${targetCompanyName})`);

    // Now analyze this company
    console.log('\n--- Analyzing Delivery Options ---');
    const deliveryOptions = await prisma.deliveryOption.findMany({
        where: { companyId: targetCompanyId }
    });
    deliveryOptions.forEach(opt => {
        console.log(`📦 Option: "${opt.name}" | Price: ${opt.price} | Active: ${opt.isActive} | Default: ${opt.isDefault}`);
    });

    console.log('\n--- Analyzing Shipping Zones ---');
    const companyZones = await prisma.shippingZone.findMany({
        where: { companyId: targetCompanyId, isActive: true }
    });

    // Dump ALL zones detailed
    console.log(`\n--- DUMPING ${companyZones.length} ZONES ---`);
    companyZones.forEach((z, idx) => {
        console.log(`[${idx}] ID: ${z.id}`);
        console.log(`    Name: "${z.name}"`);
        console.log(`    Price: ${z.price}`);
        console.log(`    Active: ${z.isActive}`);
        console.log(`    Raw Govs: ${z.governorates}`);
        console.log('-----------------------------------');
    });

    // Helper to normalize Arabic text for matching
    const normalizeText = (text) => {
        if (!text) return '';
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[أإآ]/g, 'ا') // Normalize Aleph
            .replace(/[ة]/g, 'ه')   // Normalize Taa Marbuta
            .replace(/[ي]/g, 'ى');  // Normalize Ya
    };

    // Test Match again with verbose logging & Normalization
    const testCity = 'البحر الأحمر';
    const rawSearchTerm = testCity;
    const searchTerm = normalizeText(rawSearchTerm);

    console.log(`\n🔍 Detailed Match Test for "${testCity}" (Normalized: "${searchTerm}")...`);

    const matchingZone = companyZones.find(z => {
        let govs = [];
        try {
            if (z.governorates) govs = JSON.parse(z.governorates);
        } catch (e) {
            console.log(`    ⚠️ JSON Parse Error for zone ${z.id}`);
        }
        if (!Array.isArray(govs)) govs = [govs];

        return govs.some(gov => {
            if (!gov) return false;
            const normalizedGov = normalizeText(gov);
            const isMatch = normalizedGov.includes(searchTerm) || searchTerm.includes(normalizedGov);

            if (gov.includes('البحر') || gov.includes('Red')) {
                console.log(`    Checking "${gov}" -> Normalized: "${normalizedGov}" -> Match: ${isMatch}`);
            }
            return isMatch;
        });
    });

    if (matchingZone) {
        console.log(`\n✅ FINAL RESULT: MATCH FOUND`);
        console.log(`   Zone: "${matchingZone.name}"`);
        console.log(`   Price: ${matchingZone.price}`);
    } else {
        console.log(`\n❌ FINAL RESULT: NO MATCH`);
    }
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
