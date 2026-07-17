const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function img(seed, w = 500, h = 500) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

async function main() {
  console.log("Seeding database...");

  // ---------- Categories ----------
  const footwear = await prisma.category.upsert({
    where: { slug: "footwear" },
    update: {},
    create: { name: "Footwear", slug: "footwear", icon: "shoe" },
  });

  const [sportsShoes, formalShoes, sandal, slippers] = await Promise.all([
    prisma.category.upsert({
      where: { slug: "sports-shoes" },
      update: {},
      create: { name: "Sports Shoes", slug: "sports-shoes", parentId: footwear.id },
    }),
    prisma.category.upsert({
      where: { slug: "formal-shoes" },
      update: {},
      create: { name: "Formal Shoes", slug: "formal-shoes", parentId: footwear.id },
    }),
    prisma.category.upsert({
      where: { slug: "sandal" },
      update: {},
      create: { name: "Sandal", slug: "sandal", parentId: footwear.id },
    }),
    prisma.category.upsert({
      where: { slug: "slippers" },
      update: {},
      create: { name: "Slippers", slug: "slippers", parentId: footwear.id },
    }),
  ]);

  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: { name: "Electronics", slug: "electronics", icon: "device" },
  });
  const groceries = await prisma.category.upsert({
    where: { slug: "groceries" },
    update: {},
    create: { name: "Groceries", slug: "groceries", icon: "cart" },
  });
  const beauty = await prisma.category.upsert({
    where: { slug: "beauty" },
    update: {},
    create: { name: "Beauty", slug: "beauty", icon: "sparkle" },
  });

  // ---------- Stores ----------
  const shoesFashion = await prisma.store.upsert({
    where: { slug: "shoes-fashion" },
    update: {},
    create: {
      name: "Shoes Fashion",
      slug: "shoes-fashion",
      logoUrl: img("shoes-fashion-logo", 100, 100),
      address: "Plateau, Abidjan",
      lat: 5.3197,
      lng: -4.0221,
      rating: 4.4,
    },
  });
  const ocassElectronics = await prisma.store.upsert({
    where: { slug: "ocass-electronics" },
    update: {},
    create: {
      name: "Ocass Electronics",
      slug: "ocass-electronics",
      logoUrl: img("ocass-electronics-logo", 100, 100),
      address: "Cocody, Abidjan",
      lat: 5.3599,
      lng: -3.9877,
      rating: 4.1,
    },
  });
  const freshMart = await prisma.store.upsert({
    where: { slug: "fresh-mart" },
    update: {},
    create: {
      name: "Fresh Mart",
      slug: "fresh-mart",
      logoUrl: img("fresh-mart-logo", 100, 100),
      address: "Marcory, Abidjan",
      lat: 5.2893,
      lng: -3.9997,
      rating: 4.6,
    },
  });

  // ---------- Products (matching the OCASS Footwear screenshot) ----------
  const products = [
    {
      slug: "sports-shoes-for-women",
      name: "Sports Shoes for Women",
      description: "Lightweight running shoes with breathable mesh upper.",
      categoryId: sportsShoes.id,
      storeId: shoesFashion.id,
      price: 1799,
      discountPrice: 1655,
      discountPercent: 8,
      stock: 42,
      rating: 4.3,
      images: [img("sports-shoes-women-1"), img("sports-shoes-women-2")],
      tags: ["women", "running", "sports"],
    },
    {
      slug: "women-casual-sneaker",
      name: "Women Casual Sneaker",
      description: "Everyday casual sneaker, cushioned sole, true to size.",
      categoryId: sportsShoes.id,
      storeId: shoesFashion.id,
      price: 1500,
      discountPrice: 1425,
      discountPercent: 5,
      stock: 30,
      rating: 4.1,
      images: [img("casual-sneaker-1"), img("casual-sneaker-2")],
      tags: ["women", "casual"],
    },
    {
      slug: "walking-shoes",
      name: "Walking Shoes",
      description: "Cream walking shoes with reinforced heel support.",
      categoryId: sportsShoes.id,
      storeId: shoesFashion.id,
      price: 1299,
      discountPrice: 1169,
      discountPercent: 10,
      stock: 25,
      rating: 4.5,
      images: [img("walking-shoes-1"), img("walking-shoes-2")],
      tags: ["walking", "comfort"],
    },
    {
      slug: "pink-chunky-sneakers",
      name: "Shoes",
      description: "Chunky sole pink sneakers with pastel accents.",
      categoryId: sportsShoes.id,
      storeId: shoesFashion.id,
      price: 4999,
      discountPrice: 2500,
      discountPercent: 50,
      stock: 15,
      rating: 4.0,
      images: [img("pink-sneakers-1"), img("pink-sneakers-2")],
      tags: ["women", "trendy"],
    },
    {
      slug: "classic-white-sneakers",
      name: "Shoes",
      description: "Classic white sneakers with purple swoosh accent.",
      categoryId: formalShoes.id,
      storeId: shoesFashion.id,
      price: 3999,
      discountPrice: 3719,
      discountPercent: 7,
      stock: 20,
      rating: 4.6,
      images: [img("white-sneakers-1"), img("white-sneakers-2")],
      tags: ["classic", "unisex"],
    },
    {
      slug: "leather-formal-shoes-men",
      name: "Leather Formal Shoes",
      description: "Genuine leather formal shoes for men, lace-up.",
      categoryId: formalShoes.id,
      storeId: shoesFashion.id,
      price: 5200,
      stock: 18,
      rating: 4.2,
      images: [img("formal-shoes-men-1")],
      tags: ["men", "formal", "leather"],
    },
    {
      slug: "flat-sandals-women",
      name: "Flat Sandals",
      description: "Comfortable everyday flat sandals.",
      categoryId: sandal.id,
      storeId: shoesFashion.id,
      price: 990,
      discountPrice: 850,
      discountPercent: 14,
      stock: 40,
      rating: 4.0,
      images: [img("flat-sandals-1")],
      tags: ["women", "sandal"],
    },
    {
      slug: "mens-slides",
      name: "Men's Slides",
      description: "Soft foam slides, quick-dry, non-slip sole.",
      categoryId: slippers.id,
      storeId: shoesFashion.id,
      price: 700,
      stock: 55,
      rating: 3.9,
      images: [img("mens-slides-1")],
      tags: ["men", "slippers"],
    },
    {
      slug: "wireless-earbuds",
      name: "Wireless Earbuds Pro",
      description: "Bluetooth 5.3 earbuds with noise cancellation.",
      categoryId: electronics.id,
      storeId: ocassElectronics.id,
      price: 15000,
      discountPrice: 12500,
      discountPercent: 17,
      stock: 60,
      rating: 4.4,
      images: [img("earbuds-1")],
      tags: ["audio", "wireless"],
    },
    {
      slug: "fresh-produce-basket",
      name: "Fresh Produce Basket",
      description: "Seasonal fruit and vegetable basket.",
      categoryId: groceries.id,
      storeId: freshMart.id,
      price: 3500,
      stock: 100,
      rating: 4.7,
      images: [img("produce-basket-1")],
      tags: ["fresh", "grocery"],
    },
    {
      slug: "shea-butter-body-cream",
      name: "Shea Butter Body Cream",
      description: "Locally sourced shea butter moisturizing cream.",
      categoryId: beauty.id,
      storeId: freshMart.id,
      price: 2200,
      discountPrice: 1800,
      discountPercent: 18,
      stock: 70,
      rating: 4.8,
      images: [img("shea-butter-1")],
      tags: ["skincare", "local"],
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  // ---------- Insurance plans ----------
  const plans = [
    {
      name: "Ocass Health Essential",
      category: "HEALTH",
      provider: "Ocass Assurance",
      premiumMonthly: 8000,
      coverageAmount: 2000000,
      description: "Basic health coverage including consultations and hospitalization.",
    },
    {
      name: "Ocass Auto Third-Party",
      category: "AUTO",
      provider: "Ocass Assurance",
      premiumMonthly: 5000,
      coverageAmount: 1500000,
      description: "Mandatory third-party liability cover for your vehicle.",
    },
    {
      name: "Ocass Home Protect",
      category: "HOME",
      provider: "Ocass Assurance",
      premiumMonthly: 4000,
      coverageAmount: 5000000,
      description: "Fire, theft, and water damage protection for your home.",
    },
    {
      name: "Ocass Travel Shield",
      category: "TRAVEL",
      provider: "Ocass Assurance",
      premiumMonthly: 3000,
      coverageAmount: 3000000,
      description: "Trip cancellation, medical, and baggage cover while traveling.",
    },
  ];
  for (const plan of plans) {
    const existing = await prisma.insurancePlan.findFirst({ where: { name: plan.name } });
    if (!existing) await prisma.insurancePlan.create({ data: plan });
  }

  // ---------- Restaurants ----------
  const restaurants = [
    {
      name: "Maquis Chez Tantie",
      slug: "maquis-chez-tantie",
      logoUrl: img("maquis-1", 200, 200),
      cuisine: "Ivorian",
      rating: 4.6,
      address: "Yopougon, Abidjan",
      lat: 5.3453,
      lng: -4.0864,
      menuItems: [
        { name: "Attieke Poisson", price: 2000, category: "Main", imageUrl: img("attieke-1") },
        { name: "Garba", price: 1000, category: "Main", imageUrl: img("garba-1") },
        { name: "Alloco", price: 1500, category: "Side", imageUrl: img("alloco-1") },
      ],
    },
    {
      name: "Le Grill Cocody",
      slug: "le-grill-cocody",
      logoUrl: img("grill-1", 200, 200),
      cuisine: "Grill & BBQ",
      rating: 4.3,
      address: "Cocody, Abidjan",
      lat: 5.3639,
      lng: -3.9865,
      menuItems: [
        { name: "Grilled Chicken Half", price: 3500, category: "Main", imageUrl: img("chicken-1") },
        { name: "Beef Brochette (5pcs)", price: 2500, category: "Main", imageUrl: img("brochette-1") },
      ],
    },
  ];
  for (const r of restaurants) {
    const { menuItems, ...rest } = r;
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: r.slug },
      update: {},
      create: rest,
    });
    for (const item of menuItems) {
      const existing = await prisma.menuItem.findFirst({
        where: { restaurantId: restaurant.id, name: item.name },
      });
      if (!existing) {
        await prisma.menuItem.create({ data: { ...item, restaurantId: restaurant.id } });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
