const { PrismaClient } = require("./prisma/generated/postgresql_v2");
const prisma = new PrismaClient();
async function main() {
  // Add test explanations for different routes
  const explanations = [
    {
      title: "شرح تجريبي - صفحة المنتجات",
      content: "هذا شرح تجريبي لصفحة المنتجات. يوضح كيفية إضافة وإدارة المنتجات.",
      slug: "test-products",
      targetRoute: "/products",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      isActive: true,
      order: 1
    },
    {
      title: "شرح تجريبي - صفحة الطلبات",
      content: "هذا شرح تجريبي لصفحة الطلبات. يوضح كيفية متابعة وإدارة الطلبات.",
      slug: "test-orders",
      targetRoute: "/orders",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      isActive: true,
      order: 2
    },
    {
      title: "شرح تجريبي - لوحة التحكم",
      content: "هذا شرح تجريبي للوحة التحكم الرئيسية.",
      slug: "test-dashboard",
      targetRoute: "/dashboard",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      isActive: true,
      order: 3
    }
  ];

  for (const exp of explanations) {
    await prisma.appExplanation.upsert({
      where: { slug: exp.slug },
      update: exp,
      create: exp
    });
    console.log("Created:", exp.title, "->", exp.targetRoute);
  }

  // Verify
  const all = await prisma.appExplanation.findMany();
  console.log("\nAll explanations in DB:", all.length);
  all.forEach(e => console.log(" -", e.title, "| route:", e.targetRoute, "| active:", e.isActive));
}
main().catch(console.error).finally(() => prisma.$disconnect());
