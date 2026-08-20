
const { safeDb } = require('./utils/safeDatabase');
async function main() {
    try {
        const p = await safeDb.findFirst('Product', { select: { id: true } });
        console.log('---ID---');
        console.log(p?.id || 'none');
        console.log('---ID---');
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error);
