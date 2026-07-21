// Test/demo data on top of the base seed (prisma/seed.js): login-ready
// user accounts across every role, plus sample records in each module so
// the app isn't empty when you browse it. Safe to re-run - every block
// checks for existing data first rather than blindly inserting.
//
// Sign in with OTP_DEV_MODE=true using any phone number below; the OTP
// code comes back in the /api/auth/request-otp response instead of an SMS.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function img(seed, w = 500, h = 500) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

async function main() {
  console.log("Seeding test data...");

  // ---------- Test users, one per role ----------
  const customer = await prisma.user.upsert({
    where: { phone: "+221771000001" },
    update: {},
    create: { phone: "+221771000001", name: "Awa Diop", email: "awa.diop@example.com", role: "CUSTOMER" },
  });
  const vendor = await prisma.user.upsert({
    where: { phone: "+221771000002" },
    update: {},
    create: { phone: "+221771000002", name: "Moussa Ndiaye", email: "moussa.ndiaye@example.com", role: "VENDOR" },
  });
  const agent = await prisma.user.upsert({
    where: { phone: "+221771000003" },
    update: {},
    create: { phone: "+221771000003", name: "Ibrahima Fall", email: "ibrahima.fall@example.com", role: "DELIVERY_AGENT" },
  });
  const rider = await prisma.user.upsert({
    where: { phone: "+221771000004" },
    update: {},
    create: { phone: "+221771000004", name: "Fatou Sarr", email: "fatou.sarr@example.com", role: "RIDER" },
  });
  // Posts Anando rides as an ordinary commuter, not a gig-work RIDER -
  // the two roles are intentionally independent (see schema.prisma).
  const anandoDriver = await prisma.user.upsert({
    where: { phone: "+221771000005" },
    update: {},
    create: { phone: "+221771000005", name: "Cheikh Ba", email: "cheikh.ba@example.com", role: "CUSTOMER" },
  });

  // ---------- Wallets ----------
  async function ensureWallet(userId, balance, earnings) {
    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance },
    });
    if (earnings && (await prisma.walletTransaction.count({ where: { walletId: wallet.id } })) === 0) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: earnings.type,
          direction: "CREDIT",
          amount: earnings.amount,
          balanceAfter: balance,
          purpose: earnings.purpose,
          description: earnings.description,
        },
      });
    }
    return wallet;
  }
  await ensureWallet(customer.id, 25000, {
    type: "TOPUP",
    amount: 25000,
    purpose: "WALLET_TOPUP",
    description: "Initial test balance",
  });
  await ensureWallet(agent.id, 14200, {
    type: "EARNING",
    amount: 14200,
    purpose: "DELIVERY_EARNINGS",
    description: "Delivery earnings",
  });
  await ensureWallet(rider.id, 9800, {
    type: "EARNING",
    amount: 9800,
    purpose: "RIDE_EARNINGS",
    description: "Ride earnings",
  });

  // ---------- Address for the test customer ----------
  const existingAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  const address =
    existingAddress ||
    (await prisma.address.create({
      data: {
        userId: customer.id,
        label: "Home",
        line1: "Plateau, Dakar",
        city: "Dakar",
        lat: 14.6708,
        lng: -17.4313,
        isDefault: true,
      },
    }));

  // ---------- Vendor store + products ----------
  const store = await prisma.store.upsert({
    where: { slug: "moussa-store" },
    update: {},
    create: {
      name: "Moussa Store",
      slug: "moussa-store",
      logoUrl: img("moussa-store-logo", 100, 100),
      address: "Médina, Dakar",
      lat: 14.6789,
      lng: -17.4498,
      rating: 4.5,
      ownerId: vendor.id,
    },
  });
  const electronicsCategory = await prisma.category.findUnique({ where: { slug: "electronics" } });
  if (electronicsCategory) {
    await prisma.product.upsert({
      where: { slug: "moussa-store-power-bank" },
      update: {},
      create: {
        slug: "moussa-store-power-bank",
        name: "20000mAh Power Bank",
        description: "Fast-charging power bank, dual USB output.",
        categoryId: electronicsCategory.id,
        storeId: store.id,
        price: 12000,
        discountPrice: 9900,
        discountPercent: 18,
        stock: 35,
        rating: 4.2,
        images: [img("power-bank-1")],
        tags: ["electronics", "vendor-test"],
      },
    });
  }

  // ---------- Ecommerce order for the test customer ----------
  if ((await prisma.order.count({ where: { userId: customer.id } })) === 0) {
    const products = await prisma.product.findMany({ take: 2 });
    if (products.length) {
      const total = products.reduce((sum, p) => sum + Number(p.discountPrice || p.price), 0);
      await prisma.order.create({
        data: {
          userId: customer.id,
          deliveryAddressId: address.id,
          status: "CONFIRMED",
          total,
          paid: true,
          items: {
            create: products.map((p) => ({
              productId: p.id,
              quantity: 1,
              price: p.discountPrice || p.price,
            })),
          },
        },
      });
    }
  }

  // ---------- Restaurant order for the test customer ----------
  if ((await prisma.restaurantOrder.count({ where: { userId: customer.id } })) === 0) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: "keur-tantie" },
      include: { menuItems: true },
    });
    if (restaurant && restaurant.menuItems.length) {
      const items = restaurant.menuItems.slice(0, 2);
      const total = items.reduce((sum, i) => sum + Number(i.price), 0);
      await prisma.restaurantOrder.create({
        data: {
          userId: customer.id,
          restaurantId: restaurant.id,
          status: "DELIVERED",
          total,
          items: {
            create: items.map((i) => ({ menuItemId: i.id, quantity: 1, price: i.price })),
          },
        },
      });
    }
  }

  // ---------- Insurance policy for the test customer ----------
  if ((await prisma.insurancePolicy.count({ where: { userId: customer.id } })) === 0) {
    const plan = await prisma.insurancePlan.findFirst({ where: { name: "Ocass Auto Third-Party" } });
    if (plan) {
      await prisma.insurancePolicy.create({
        data: {
          userId: customer.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // ---------- Delivery request, one open + one assigned to the test agent ----------
  if ((await prisma.deliveryRequest.count({ where: { userId: customer.id } })) === 0) {
    await prisma.deliveryRequest.create({
      data: {
        userId: customer.id,
        pickupAddress: "Plateau, Dakar",
        dropoffAddress: "Almadies, Dakar",
        packageNote: "Small package, handle with care",
        priceEstimate: 1800,
        status: "REQUESTED",
      },
    });
    await prisma.deliveryRequest.create({
      data: {
        userId: customer.id,
        pickupAddress: "Médina, Dakar",
        dropoffAddress: "Point E, Dakar",
        packageNote: "Documents",
        priceEstimate: 1200,
        status: "ACCEPTED",
        assignedAgentId: agent.id,
      },
    });
  }

  // ---------- Ride request, assigned to the test rider ----------
  if ((await prisma.rideRequest.count({ where: { userId: customer.id } })) === 0) {
    await prisma.rideRequest.create({
      data: {
        userId: customer.id,
        pickupAddress: "Ngor, Dakar",
        dropoffAddress: "Aéroport AIBD",
        vehicleType: "COMFORT",
        priceEstimate: 3200,
        status: "ACCEPTED",
        assignedRiderId: rider.id,
      },
    });
  }

  // ---------- Anando: postings + a booking, matching what bookSeat would produce ----------
  let posting = await prisma.ridePosting.findFirst({ where: { driverId: anandoDriver.id } });
  if (!posting) {
    posting = await prisma.ridePosting.create({
      data: {
        driverId: anandoDriver.id,
        originAddress: "Plateau, Dakar",
        originLat: 14.6708,
        originLng: -17.4313,
        destinationAddress: "Almadies, Dakar",
        destinationLat: 14.7444,
        destinationLng: -17.5133,
        departureAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        isInstant: false,
        seatsTotal: 3,
        seatsAvailable: 2,
        pricePerSeat: 1500,
        status: "OPEN",
      },
    });
    await prisma.ridePosting.create({
      data: {
        driverId: anandoDriver.id,
        originAddress: "Médina, Dakar",
        originLat: 14.6789,
        originLng: -17.4498,
        destinationAddress: "Aéroport AIBD",
        destinationLat: 14.6708,
        destinationLng: -17.0733,
        departureAt: new Date(),
        isInstant: true,
        seatsTotal: 4,
        seatsAvailable: 3,
        pricePerSeat: 2500,
        status: "OPEN",
      },
    });
  }
  if ((await prisma.rideBooking.count({ where: { passengerId: customer.id } })) === 0) {
    await prisma.rideBooking.create({
      data: {
        postingId: posting.id,
        passengerId: customer.id,
        seatsBooked: 1,
        paymentMethod: "CASH",
        paid: false,
        status: "CONFIRMED",
      },
    });
    await prisma.notification.create({
      data: {
        userId: anandoDriver.id,
        type: "ANANDO_BOOKING",
        title: "New Anando booking",
        body: `${customer.name} booked 1 seat on your Plateau → Almadies ride`,
        data: { postingId: posting.id },
      },
    });
  }

  // ---------- A couple more notifications so the test customer's inbox isn't empty ----------
  if ((await prisma.notification.count({ where: { userId: customer.id } })) === 0) {
    await prisma.notification.create({
      data: {
        userId: customer.id,
        type: "DELIVERY_STATUS",
        title: "Delivery in progress",
        body: "Your package is on its way to Point E",
        data: {},
        read: false,
      },
    });
    await prisma.notification.create({
      data: {
        userId: customer.id,
        type: "INSURANCE_ACTIVATED",
        title: "Insurance policy activated",
        body: "Your auto insurance is now active",
        data: {},
        read: true,
      },
    });
  }

  console.log("Test data seed complete.\n");
  console.log("Sign in with OTP_DEV_MODE using any of these phone numbers (OTP comes back in the API response):");
  [customer, vendor, agent, rider, anandoDriver].forEach((u) => {
    console.log(`  ${u.phone}  ${u.name}  (${u.role})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
