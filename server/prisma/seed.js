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
      address: "Plateau, Dakar",
      lat: 14.6708,
      lng: -17.4313,
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
      address: "Sacré-Coeur, Dakar",
      lat: 14.7180,
      lng: -17.4640,
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
      address: "Parcelles Assainies, Dakar",
      lat: 14.7645,
      lng: -17.4114,
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
      name: "Keur Tantie",
      slug: "keur-tantie",
      logoUrl: img("keur-tantie-1", 200, 200),
      cuisine: "Senegalese",
      rating: 4.6,
      address: "Médina, Dakar",
      lat: 14.6789,
      lng: -17.4498,
      menuItems: [
        { name: "Thieboudienne", price: 2000, category: "Main", imageUrl: img("thieboudienne-1") },
        { name: "Yassa Poulet", price: 1800, category: "Main", imageUrl: img("yassa-1") },
        { name: "Fataya", price: 1000, category: "Side", imageUrl: img("fataya-1") },
      ],
    },
    {
      name: "Le Grill Almadies",
      slug: "le-grill-almadies",
      logoUrl: img("grill-1", 200, 200),
      cuisine: "Grill & BBQ",
      rating: 4.3,
      address: "Almadies, Dakar",
      lat: 14.7444,
      lng: -17.5133,
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

  // ---------- Mobile top-up / bill payment ----------
  // Senegal's three mobile operators - Orange, Free (formerly Tigo), and
  // Expresso - each with their real network prefixes.
  const mobileServices = [
    {
      name: "Orange Sénégal",
      logoUrl: img("orange-sn-logo", 200, 200),
      type: "AIRTIME",
      phonePrefixes: ["77", "78"],
      minAmount: 100,
      maxAmount: 100000,
    },
    {
      name: "Free Sénégal",
      logoUrl: img("free-sn-logo", 200, 200),
      type: "AIRTIME",
      phonePrefixes: ["76"],
      minAmount: 100,
      maxAmount: 100000,
    },
    {
      name: "Expresso Sénégal",
      logoUrl: img("expresso-sn-logo", 200, 200),
      type: "AIRTIME",
      phonePrefixes: ["70", "75"],
      minAmount: 100,
      maxAmount: 100000,
    },
    {
      name: "SENELEC - Electricity",
      logoUrl: img("senelec-logo", 200, 200),
      type: "BILL",
      billCategory: "ELECTRICITY",
      minAmount: 500,
      maxAmount: 500000,
    },
    {
      name: "SEN'EAU - Water",
      logoUrl: img("seneau-logo", 200, 200),
      type: "BILL",
      billCategory: "WATER",
      minAmount: 500,
      maxAmount: 500000,
    },
    {
      name: "Canal+ - TV",
      logoUrl: img("canalplus-logo", 200, 200),
      type: "BILL",
      billCategory: "TV",
      minAmount: 1000,
      maxAmount: 200000,
    },
  ];
  for (const service of mobileServices) {
    const existing = await prisma.mobileService.findFirst({ where: { name: service.name } });
    if (!existing) await prisma.mobileService.create({ data: service });
  }

  // ---------- Test users, wallets, cart, wishlist, reviews, and orders ----------
  const customer = await prisma.user.upsert({
    where: { phone: "+221772001001" },
    update: { name: "Aissatou Ndiaye", email: "aissatou@example.com" },
    create: {
      phone: "+221772001001",
      name: "Aissatou Ndiaye",
      email: "aissatou@example.com",
      role: "CUSTOMER",
    },
  });

  const vendor = await prisma.user.upsert({
    where: { phone: "+221772001002" },
    update: { name: "Mamadou Diop", email: "mamadou@example.com" },
    create: {
      phone: "+221772001002",
      name: "Mamadou Diop",
      email: "mamadou@example.com",
      role: "VENDOR",
    },
  });

  const deliveryAgent = await prisma.user.upsert({
    where: { phone: "+221772001003" },
    update: { name: "Fatou Cisse", email: "fatou@example.com" },
    create: {
      phone: "+221772001003",
      name: "Fatou Cisse",
      email: "fatou@example.com",
      role: "DELIVERY_AGENT",
    },
  });

  await prisma.store.update({
    where: { id: shoesFashion.id },
    data: { ownerId: vendor.id },
  });

  const wallet = await prisma.wallet.upsert({
    where: { userId: customer.id },
    update: { balance: 20000 },
    create: { userId: customer.id, balance: 20000, currency: "XOF" },
  });

  const address = await prisma.address.findFirst({
    where: { userId: customer.id, label: "Home" },
  });
  const customerAddress =
    address ||
    (await prisma.address.create({
      data: {
        userId: customer.id,
        label: "Home",
        line1: "123 Rue Faidherbe",
        city: "Dakar",
        lat: 14.6927,
        lng: -17.4440,
        isDefault: true,
      },
    }));

  const sportsShoesProduct = await prisma.product.findUnique({
    where: { slug: "sports-shoes-for-women" },
  });
  const casualSneakerProduct = await prisma.product.findUnique({
    where: { slug: "women-casual-sneaker" },
  });
  const freshestProduceProduct = await prisma.product.findUnique({
    where: { slug: "fresh-produce-basket" },
  });

  if (!sportsShoesProduct || !casualSneakerProduct || !freshestProduceProduct) {
    throw new Error("Expected seeded products not found when creating test data.");
  }

  await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: customer.id,
        productId: sportsShoesProduct.id,
      },
    },
    update: { quantity: 2 },
    create: {
      userId: customer.id,
      productId: sportsShoesProduct.id,
      quantity: 2,
    },
  });

  await prisma.wishlist.upsert({
    where: {
      userId_productId: {
        userId: customer.id,
        productId: freshestProduceProduct.id,
      },
    },
    update: {},
    create: {
      userId: customer.id,
      productId: freshestProduceProduct.id,
    },
  });

  const existingReview = await prisma.review.findFirst({
    where: {
      userId: customer.id,
      productId: casualSneakerProduct.id,
    },
  });
  if (!existingReview) {
    await prisma.review.create({
      data: {
        userId: customer.id,
        productId: casualSneakerProduct.id,
        rating: 5,
        comment: "Very comfortable and fits perfectly. Great value!",
      },
    });
  }

  const existingOrder = await prisma.order.findFirst({
    where: {
      userId: customer.id,
      status: "CONFIRMED",
      paid: true,
    },
  });
  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        deliveryAddressId: customerAddress.id,
        status: "CONFIRMED",
        total: "3080",
        paid: true,
        payment: {
          create: {
            provider: "PAYDUNYA",
            providerToken: "paydunya-order-1001",
            checkoutUrl: "https://paydunya.com/invoice/1001",
            status: "COMPLETED",
            amount: "3080",
            currency: "XOF",
            purpose: "ECOMMERCE_ORDER",
            purposeId: "order-1001",
          },
        },
      },
    });

    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order.id,
          productId: sportsShoesProduct.id,
          quantity: 1,
          price: sportsShoesProduct.discountPrice?.toString() || sportsShoesProduct.price.toString(),
        },
        {
          orderId: order.id,
          productId: casualSneakerProduct.id,
          quantity: 1,
          price: casualSneakerProduct.discountPrice?.toString() || casualSneakerProduct.price.toString(),
        },
      ],
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "PAYMENT",
        direction: "DEBIT",
        amount: "3080",
        balanceAfter: wallet.balance.minus(3080).toString(),
        purpose: "ECOMMERCE_ORDER",
        purposeId: order.id,
        description: "Order payment for ecommerce checkout",
      },
    });

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: wallet.balance.minus(3080) },
    });
  }

  const orangeService = await prisma.mobileService.findFirst({ where: { name: "Orange Sénégal" } });
  if (orangeService) {
    const existingTx = await prisma.mobileTransaction.findFirst({
      where: { userId: customer.id, reference: "mobile-topup-1001" },
    });
    if (!existingTx) {
      await prisma.mobileTransaction.create({
        data: {
          userId: customer.id,
          serviceId: orangeService.id,
          type: "AIRTIME",
          phoneNumber: "+221772001001",
          amount: "2000",
          status: "SUCCESS",
          reference: "mobile-topup-1001",
        },
      });
    }
  }

  const existingRestaurantOrder = await prisma.restaurantOrder.findFirst({
    where: {
      userId: customer.id,
      status: "PENDING",
      note: "Extra sauce, please",
    },
  });
  if (!existingRestaurantOrder) {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: "keur-tantie" } });
    const menuItem = restaurant
      ? await prisma.menuItem.findFirst({ where: { restaurantId: restaurant.id } })
      : null;
    if (restaurant && menuItem) {
      const restaurantOrder = await prisma.restaurantOrder.create({
        data: {
          userId: customer.id,
          restaurantId: restaurant.id,
          status: "PENDING",
          total: "2000",
          note: "Extra sauce, please",
        },
      });
      await prisma.restaurantOrderItem.create({
        data: {
          orderId: restaurantOrder.id,
          menuItemId: menuItem.id,
          quantity: 1,
          price: menuItem.price,
        },
      });
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
