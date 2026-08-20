const { z } = require("zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { haversineDistanceKm, hasCoordinates } = require("../../utils/geo");
const { getModuleFeeConfig } = require("../../utils/feeConfig");
const { getServiceFeeConfig, computeFeeAndTax } = require("../../utils/serviceFee");
const { payoutOwnerForOrder } = require("./restaurant.service");

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  note: z.string().optional(),
  // Required - this module is delivery-only for now (no in-app "pickup at
  // restaurant" option), so every order needs a real dropoff for the
  // delivery dispatch this restaurant order eventually creates (see
  // dispatchForDelivery below).
  deliveryAddress: z.string().min(3),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
});

const ORDER_INCLUDE = {
  restaurant: true,
  items: { include: { menuItem: true } },
};

async function listMyOrders(req, res, next) {
  try {
    const orders = await prisma.restaurantOrder.findMany({
      where: { userId: req.user.id },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

/**
 * Places and immediately pays for an order via wallet - the only payment
 * method wired up for this module today (unlike ecommerce, which also
 * offers a PayDunya redirect; adding that here is a documented follow-up,
 * not a silent gap - see README's "Restaurant" section). A failed debit
 * rolls the order back entirely rather than leaving an unpaid PENDING row
 * behind, same pattern as ecommerce's wallet checkout path.
 */
async function createOrder(req, res, next) {
  try {
    const data = createOrderSchema.parse(req.body);
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: data.items.map((i) => i.menuItemId) },
        restaurantId: restaurant.id,
        isActive: true,
      },
    });
    if (menuItems.length !== data.items.length) {
      return res.status(400).json({ message: "One or more menu items are invalid for this restaurant" });
    }
    const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

    const subtotal = data.items.reduce((sum, item) => {
      const menuItem = menuItemById.get(item.menuItemId);
      return sum + Number(menuItem.price) * item.quantity;
    }, 0);
    const feeConfig = await getServiceFeeConfig("restaurant", "Restaurant", restaurant.id);
    const { feeAmount, taxAmount, total } = computeFeeAndTax(subtotal, feeConfig);

    const order = await prisma.restaurantOrder.create({
      data: {
        userId: req.user.id,
        restaurantId: restaurant.id,
        subtotal,
        feeAmount,
        taxAmount,
        total,
        note: data.note,
        deliveryAddress: data.deliveryAddress,
        deliveryLat: data.deliveryLat,
        deliveryLng: data.deliveryLng,
        items: {
          create: data.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: menuItemById.get(item.menuItemId).price,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    try {
      await walletService.debit({
        userId: req.user.id,
        amount: total,
        purpose: "RESTAURANT_ORDER",
        purposeId: order.id,
        description: `${restaurant.name} order #${order.id.slice(0, 8)}`,
      });
    } catch (debitErr) {
      await prisma.restaurantOrder.delete({ where: { id: order.id } });
      if (debitErr instanceof walletService.InsufficientBalanceError) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
    }

    const paidOrder = await prisma.restaurantOrder.update({
      where: { id: order.id },
      data: { paid: true, status: "CONFIRMED" },
      include: ORDER_INCLUDE,
    });

    // Never fail the customer's order over a payout bookkeeping error -
    // log and move on, same best-effort pattern as vendor payout.
    payoutOwnerForOrder(order.id).catch((err) => {
      console.error(`[restaurant payout] order ${order.id}:`, err);
    });

    res.status(201).json({ order: paidOrder });
  } catch (err) {
    next(err);
  }
}

// Cancellable from either side (customer or owner) up until the order is
// actually out for delivery - once a DeliveryRequest exists and an agent
// may already be en route to pick it up, cancelling would strand a real
// dispatch instead of just an in-kitchen order.
const CANCELLABLE_STATUSES = ["CONFIRMED", "PREPARING"];

async function refundIfPaid(order) {
  if (!order.paid) return;
  await walletService.credit({
    userId: order.userId,
    amount: Number(order.total),
    type: "REFUND",
    purpose: "RESTAURANT_ORDER",
    purposeId: order.id,
    description: `Refund - order #${order.id.slice(0, 8)} cancelled`,
  });
}

/** Customer-initiated cancellation of their own order. */
async function cancelOrder(req, res, next) {
  try {
    const existing = await prisma.restaurantOrder.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Conditional updateMany as the concurrency guard (same pattern as
    // delivery's acceptRequest) - only the first caller to catch it in a
    // cancellable state wins, so a race can't trigger a double refund.
    const result = await prisma.restaurantOrder.updateMany({
      where: { id: req.params.id, status: { in: CANCELLABLE_STATUSES } },
      data: { status: "CANCELLED" },
    });
    if (result.count === 0) {
      return res.status(400).json({ message: `Cannot cancel an order that is ${existing.status}` });
    }
    await refundIfPaid(existing);
    const order = await prisma.restaurantOrder.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// ---------------- Restaurant owner: orders ----------------

async function listMyRestaurantOrders(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: req.user.id } });
    if (!restaurant) return res.status(400).json({ message: "Create your restaurant first" });
    const orders = await prisma.restaurantOrder.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        items: { include: { menuItem: true } },
        user: { select: { id: true, name: true, phone: true } },
        deliveryRequest: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

// Falls back to these when an admin hasn't set ModuleConfig("delivery").
// feeConfig - mirrors delivery.controller.js's own DEFAULT_FEE_CONFIG/
// estimatePrice exactly, duplicated rather than imported since delivery's
// version is private to that module; both compute the same real-distance
// (or simulated-fallback) price for a pickup/dropoff pair.
const DELIVERY_DEFAULT_FEE_CONFIG = {
  baseFare: 500,
  ratePerKm: 300,
  agentSharePercent: 80,
};

function estimateDeliveryPrice({ pickupLat, pickupLng, dropoffLat, dropoffLng }, feeConfig) {
  if (hasCoordinates(pickupLat, pickupLng, dropoffLat, dropoffLng)) {
    const km = haversineDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    return Math.round(feeConfig.baseFare + km * feeConfig.ratePerKm);
  }
  return 1500 + Math.round(Math.random() * 2000);
}

/**
 * Hands a ready order off to the delivery module: creates a DeliveryRequest
 * (pickup = restaurant, dropoff = the order's delivery address) with no
 * assigned agent, so it appears on the same open job board any package-
 * delivery agent already sees (GET /delivery/jobs/available) - this is the
 * entire "use the delivery module" integration, no parallel dispatch
 * system. The delivery fee is estimated the same way a standalone package
 * delivery is, but isn't itemized onto the customer's order total - it's
 * platform-absorbed for now (the agent is still paid their normal share
 * out of that estimate); charging it through to the order total is a
 * documented follow-up, not silently dropped.
 */
async function dispatchForDelivery(order, ownerPhone) {
  const restaurant = order.restaurant;
  if (!restaurant.address) {
    throw Object.assign(new Error("Restaurant has no pickup address configured"), { status: 400 });
  }
  const feeConfig = await getModuleFeeConfig("delivery", DELIVERY_DEFAULT_FEE_CONFIG);
  const pickup = { pickupLat: restaurant.lat, pickupLng: restaurant.lng, dropoffLat: order.deliveryLat, dropoffLng: order.deliveryLng };

  const deliveryRequest = await prisma.deliveryRequest.create({
    data: {
      userId: order.userId,
      senderName: restaurant.name,
      senderPhone: ownerPhone,
      pickupAddress: restaurant.address,
      pickupLat: restaurant.lat,
      pickupLng: restaurant.lng,
      receiverName: order.user.name || order.user.phone,
      receiverPhone: order.user.phone,
      dropoffAddress: order.deliveryAddress,
      dropoffLat: order.deliveryLat,
      dropoffLng: order.deliveryLng,
      packageNote: `Restaurant order from ${restaurant.name} (#${order.id.slice(0, 8)})`,
      priceEstimate: estimateDeliveryPrice(pickup, feeConfig),
    },
  });

  return prisma.restaurantOrder.update({
    where: { id: order.id },
    data: { deliveryRequestId: deliveryRequest.id, status: "OUT_FOR_DELIVERY" },
    include: { ...ORDER_INCLUDE, deliveryRequest: true },
  });
}

const OWNER_TRANSITIONS = {
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
};

const updateOrderStatusSchema = z.object({
  status: z.enum(["PREPARING", "OUT_FOR_DELIVERY", "CANCELLED"]),
});

/**
 * Restaurant owner walks their own order through CONFIRMED -> PREPARING ->
 * OUT_FOR_DELIVERY (or CANCELLED from either of the first two) - DELIVERED
 * is never set here, it only ever arrives via the linked DeliveryRequest's
 * own completion (see markDelivered's cascade in delivery.controller.js),
 * so "delivered" always means an agent actually confirmed the handoff.
 */
async function updateOrderStatus(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: req.user.id } });
    if (!restaurant) return res.status(400).json({ message: "Create your restaurant first" });

    const existing = await prisma.restaurantOrder.findUnique({
      where: { id: req.params.id },
      include: { ...ORDER_INCLUDE, user: true },
    });
    if (!existing || existing.restaurantId !== restaurant.id) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { status } = updateOrderStatusSchema.parse(req.body);
    const allowed = OWNER_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot move an order from ${existing.status} to ${status}` });
    }
    // Precondition checked before claiming the transition below, not
    // after - failing here leaves the order untouched, whereas failing
    // after the claim would strand it at OUT_FOR_DELIVERY with no
    // DeliveryRequest and no way to retry (OWNER_TRANSITIONS has no
    // entry for that state).
    if (status === "OUT_FOR_DELIVERY" && !restaurant.address) {
      return res.status(400).json({ message: "Restaurant has no pickup address configured" });
    }

    // Conditional updateMany as the concurrency guard (same pattern as
    // delivery's acceptRequest and this module's own cancelOrder) - claims
    // the transition atomically against the exact status just read, so two
    // racing requests (double-click, retry) can't both pass: one would
    // otherwise double-refund a cancellation, or double-dispatch a
    // delivery (two DeliveryRequest rows for one order, the second
    // orphaned but still live on the agent job board).
    const claimed = await prisma.restaurantOrder.updateMany({
      where: { id: existing.id, restaurantId: restaurant.id, status: existing.status },
      data: { status },
    });
    if (claimed.count === 0) {
      return res.status(409).json({ message: "Order status changed - please refresh" });
    }

    if (status === "CANCELLED") {
      await refundIfPaid(existing);
      const order = await prisma.restaurantOrder.findUnique({ where: { id: existing.id }, include: ORDER_INCLUDE });
      return res.json({ order });
    }

    if (status === "OUT_FOR_DELIVERY") {
      const order = await dispatchForDelivery(existing, req.user.phone);
      return res.json({ order });
    }

    const order = await prisma.restaurantOrder.findUnique({ where: { id: existing.id }, include: ORDER_INCLUDE });
    res.json({ order });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

module.exports = {
  listMyOrders,
  createOrder,
  cancelOrder,
  listMyRestaurantOrders,
  updateOrderStatus,
};
