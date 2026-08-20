const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function seedShoes() {
  try {
    const prisma = await getSharedPrismaClientAsync();

    // Find the company by name or slug
    const company = await prisma.company.findFirst({
        where: { 
          OR: [
            { name: { contains: 'm22', mode: 'insensitive' } },
            { slug: { contains: 'm22', mode: 'insensitive' } }
          ],
          isActive: true 
        }
    });

    if (!company) {
      console.log('No active company found. Run a full seed or create a company first.');
      process.exit(1);
    }

    const companyId = company.id;

    // Shoe Data
    const shoes = [
      {
        name: "حذاء رياضي إير ماكس برو",
        description: "حذاء رياضي خفيف الوزن ومريح للمشي الطويل والتمارين الرياضية.",
        price: 850.00,
        comparePrice: 1200.00,
        stock: 50,
        images: '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
        sku: "SH-AIR-PRO",
        isActive: true,
        companyId
      },
      {
        name: "حذاء ركض سريع النسخة 2",
        description: "تصميم انسيابي للركض السريع مع بطانة مطاطية مريحة.",
        price: 950.00,
        comparePrice: 1100.00,
        stock: 45,
        images: '["https://images.unsplash.com/photo-1508215885820-4585e5613588?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1508215885820-4585e5613588?w=800&q=80",
        sku: "SH-RUN-V2",
        isActive: true,
        companyId
      },
      {
        name: "حذاء كلاسيك يومي",
        description: "حذاء مريح يناسب الاستخدام اليومي والعمل الكجوال.",
        price: 650.00,
        comparePrice: 850.00,
        stock: 120,
        images: '["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
        sku: "SH-CLS-001",
        isActive: true,
        companyId
      },
      {
        name: "بوت شتوي جلد أصلي",
        description: "بوت متين ودافئ مصنوع من الجلد الطبيعي للأجواء الباردة.",
        price: 1850.00,
        comparePrice: 2200.00,
        stock: 20,
        images: '["https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80",
        sku: "BT-LTR-WNTR",
        isActive: true,
        companyId
      },
      {
        name: "حذاء رسمي رجالي إيطالي",
        description: "حذاء مناسب للحفلات والمناسبات الرسمية، تصميم إيطالي فاخر.",
        price: 2500.00,
        comparePrice: 3000.00,
        stock: 15,
        images: '["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80",
        sku: "SH-FRM-IT",
        isActive: true,
        companyId
      },
      {
        name: "سنيكرز خفيف قماشي",
        description: "سنيكرز بخامات قماشية تسمح بالتهوية ومثالي لفصل الصيف.",
        price: 499.00,
        comparePrice: 650.00,
        stock: 200,
        images: '["https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80",
        sku: "SN-SMR-LT",
        isActive: true,
        companyId
      },
      {
        name: "شوز المشي المريح",
        description: "بطانة طبية تدعم باطن القدم لأطول فترات الوقوف.",
        price: 1100.00,
        comparePrice: 1400.00,
        stock: 80,
        images: '["https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80",
        sku: "SH-WLK-MED",
        isActive: true,
        companyId
      },
      {
        name: "حذاء تنزه للبر والجبال",
        description: "حذاء بأسفل مانع للانزلاق مخصص للتضاريس الوعرة.",
        price: 1450.00,
        comparePrice: 1800.00,
        stock: 30,
        images: '["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80",
        sku: "SH-TRK-01",
        isActive: true,
        companyId
      },
      {
        name: "حذاء كاجوال جلد طبيعي",
        description: "حذاء مميز يجمع بين الأناقة والراحة.",
        price: 1250.00,
        comparePrice: 1500.00,
        stock: 55,
        images: '["https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80",
        sku: "SH-CAS-LTR",
        isActive: true,
        companyId
      },
      {
        name: "حذاء رياضي التيميت للتدريب",
        description: "حذاء للرياضات المتعددة، يوفر ثباتًا ومرونة.",
        price: 1600.00,
        comparePrice: 1900.00,
        stock: 40,
        images: '["https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80"]',
        mainImage: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80",
        sku: "SH-TRN-ULT",
        isActive: true,
        companyId
      }
    ];

    console.log(`Updating images for 10 shoes for company: ${company.name} (${companyId})...`);

    let count = 0;
    for (const shoe of shoes) {
      const existingProduct = await prisma.product.findUnique({
        where: { companyId_sku: { companyId, sku: shoe.sku } }
      });
      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
             images: shoe.images,
             mainImage: shoe.mainImage,
          }
        });
        count++;
      }
    }

    console.log(`Successfully updated ${count} products with real shoe images.`);
    process.exit(0);
  } catch (error) {
    console.error('Error adding products:', error);
    process.exit(1);
  }
}

seedShoes();
