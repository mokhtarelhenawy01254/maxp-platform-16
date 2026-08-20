const { getSharedPrismaClient } = require('./services/sharedDatabase');
async function check() {
    const prisma = getSharedPrismaClient();
    const emp = await prisma.employee.findFirst({
        where: { userId: "cmlf0hsds0002vbd8j2tlp2wp" }
    });
    console.log("Employee record:", emp ? "exists" : "missing", emp || "");
}
check().catch(console.error);
