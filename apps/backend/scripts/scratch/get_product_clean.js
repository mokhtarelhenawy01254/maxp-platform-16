
const { safeDb } = require('./utils/safeDatabase');
async function main() {
    try {
        const p = await safeDb.findFirst('Product', {
            where: { isDeleted: false },
            select: { id: true, companyId: true, name: true }
        });
        console.log('---DATA---');
        console.log(JSON.stringify(p));
        console.log('---DATA---');
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error);
