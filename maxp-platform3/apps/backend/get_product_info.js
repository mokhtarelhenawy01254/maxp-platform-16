
const { safeDb } = require('./utils/safeDatabase');
async function main() {
    try {
        const p = await safeDb.findFirst('Product', { select: { id: true, companyId: true, name: true } });
        console.log(JSON.stringify(p));
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error);
