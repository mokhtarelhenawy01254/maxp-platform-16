const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@mokhtarelhenawy.com';
  const targetCompanyId = 'cmopgxu3a07i4jujj6f1oh32h'; // max-p

  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }

  console.log('Found user:', user.id, user.email, 'Current companyId:', user.companyId);

  // 2. Find target company
  const company = await prisma.company.findUnique({
    where: { id: targetCompanyId },
  });

  if (!company) {
    console.error('Company not found:', targetCompanyId);
    process.exit(1);
  }

  console.log('Found company:', company.id, company.name, company.slug);

  // 3. Clear isDefault on any existing memberships for this user
  await prisma.userCompany.updateMany({
    where: { userId: user.id },
    data: { isDefault: false },
  });

  // 4. Upsert UserCompany membership for max-p as OWNER + isDefault: true
  const userCompany = await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      role: 'OWNER',
      isActive: true,
      isDefault: true,
    },
    create: {
      userId: user.id,
      companyId: company.id,
      role: 'OWNER',
      isActive: true,
      isDefault: true,
    },
  });

  console.log('UserCompany membership created/updated:', userCompany);

  // 5. Update user's primary companyId
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      companyId: company.id,
    },
    include: {
      company: { select: { id: true, name: true, slug: true } },
      userCompanies: {
        where: { isActive: true },
        include: { company: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  console.log('Updated user successfully:');
  console.log(JSON.stringify({
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    companyId: updatedUser.companyId,
    company: updatedUser.company,
    userCompanies: updatedUser.userCompanies.map(uc => ({
      companyId: uc.companyId,
      name: uc.company?.name,
      slug: uc.company?.slug,
      role: uc.role,
      isDefault: uc.isDefault,
    })),
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
