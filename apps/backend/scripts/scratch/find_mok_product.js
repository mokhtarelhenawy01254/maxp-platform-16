
const { safeDb } = require('./utils/safeDatabase');
async function main() {
    try {
        const company = await safeDb.findFirst('Company', { where: { slug: 'mok' } });
        if (!company) {
            console.log('Company mok not found');
            return;
        }
        console.log('COMPANY_ID:', company.id);
        const product = await safeDb.findFirst('Product', {
            where: { companyId: company.id, isDeleted: false },
            select: { id: true, name: true }
        });
        if (product) {
            console.log('PRODUCT_ID:', product.id);
            console.log('PRODUCT_NAME:', product.name);
        } else {
            console.log('No products found for company mok');
        }
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error);
