const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { uniqueSlug } = require("../../utils/slugify");
const { haversineDistanceKm, hasCoordinates } = require("../../utils/geo");
const { getModuleFeeConfig } = require("../../utils/feeConfig");

async function requireOwnStore(req, res) {
  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) {
    res.status(400).json({ message: "Create your store first" });
    return null;
  }
  return store;
}

/** Public - powers the /store/[slug] storefront page (see pages/store/[slug].js). */
async function getStoreBySlug(req, res, next) {
  try {
    const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ store });
  } catch (err) {
    next(err);
  }
}

/**
 * Public - the only general store-listing endpoint in the app (everything
 * else is either a single storefront lookup above or admin-only). Built
 * for the main Home Screen's "Featured shops" section (see
 * AdminVendorsTab.js's isFeatured toggle), so `featured=true` is the only
 * filter for now - add more as real listing use cases show up rather than
 * guessing at them.
 */
async function listStores(req, res, next) {
  try {
    const { featured } = req.query;
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
        ...(featured === "true" ? { isFeatured: true } : {}),
      },
      orderBy: { rating: "desc" },
      take: 20,
    });
    res.json({ stores });
  } catch (err) {
    next(err);
  }
}

async function getMyStore(req, res, next) {
  try {
    const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
    res.json({ store });
  } catch (err) {
    next(err);
  }
}

const storeSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

async function createStore(req, res, next) {
  try {
    const data = storeSchema.parse(req.body);
    const existing = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
    if (existing) {
      return res.status(409).json({ message: "You already have a store" });
    }
    const slug = await uniqueSlug(
      data.name,
      (s) => prisma.store.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const store = await prisma.store.create({
      data: { ...data, logoUrl: data.logoUrl || null, slug, ownerId: req.user.id },
    });
    res.status(201).json({ store });
  } catch (err) {
    next(err);
  }
}

const updateStoreSchema = storeSchema.partial();

async function updateStore(req, res, next) {
  try {
    const existing = await requireOwnStore(req, res);
    if (!existing) return;
    const data = updateStoreSchema.parse(req.body);
    const store = await prisma.store.update({
      where: { id: existing.id },
      data: { ...data, logoUrl: data.logoUrl === "" ? null : data.logoUrl },
    });
    res.json({ store });
  } catch (err) {
    next(err);
  }
}

async function listMyProducts(req, res, next) {
  try {
    const store = await requireOwnStore(req, res);
    if (!store) return;
    const products = await prisma.product.findMany({
      where: { storeId: store.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

const productObjectSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  price: z.number().positive(),
  discountPrice: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
});

const createProductSchema = productObjectSchema.refine(
  (d) => !d.discountPrice || d.discountPrice < d.price,
  { message: "Discount price must be lower than the regular price", path: ["discountPrice"] }
);

const updateProductSchema = productObjectSchema.partial().extend({
  isActive: z.boolean().optional(),
});

/** discountPercent is derived, never trusted from the client - it always
 * has to agree with price/discountPrice or the storefront's "X% OFF"
 * badge and the actual charged price could disagree. */
function withDiscountPercent(data) {
  if (!data.discountPrice) return { ...data, discountPercent: null };
  return { ...data, discountPercent: Math.round((1 - data.discountPrice / data.price) * 100) };
}

async function createProduct(req, res, next) {
  try {
    const store = await requireOwnStore(req, res);
    if (!store) return;
    const data = createProductSchema.parse(req.body);
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return res.status(400).json({ message: "Unknown category" });

    const slug = await uniqueSlug(
      data.name,
      (s) => prisma.product.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const product = await prisma.product.create({
      data: { ...withDiscountPercent(data), slug, storeId: store.id },
      include: { category: true },
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const store = await requireOwnStore(req, res);
    if (!store) return;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.storeId !== store.id) {
      return res.status(404).json({ message: "Product not found" });
    }
    const data = updateProductSchema.parse(req.body);
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) return res.status(400).json({ message: "Unknown category" });
    }

    // price/discountPrice are validated and discountPercent recomputed
    // together against the *effective* pair (existing value merged with
    // whichever of the two this request actually touched), so e.g.
    // updating only `price` still keeps discountPercent honest against
    // the unchanged discountPrice.
    let priceFields = {};
    if ("price" in data || "discountPrice" in data) {
      const effective = {
        price: "price" in data ? data.price : Number(existing.price),
        discountPrice:
          "discountPrice" in data ? data.discountPrice : existing.discountPrice ? Number(existing.discountPrice) : null,
      };
      if (effective.discountPrice && effective.discountPrice >= effective.price) {
        return res.status(400).json({ message: "Discount price must be lower than the regular price" });
      }
      priceFields = withDiscountPercent(effective);
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { ...data, ...priceFields },
      include: { category: true },
    });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

/** Soft delete - flips isActive off rather than removing the row, since
 * existing carts/orders/wishlists/reviews reference it by id. */
async function deactivateProduct(req, res, next) {
  try {
    const store = await requireOwnStore(req, res);
    if (!store) return;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.storeId !== store.id) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

/**
 * Orders containing at least one item from this vendor's store. Each
 * order's `items` is filtered down to only that vendor's own items - a
 * cart/order can in principle span multiple stores, and a vendor should
 * only ever see their own line items, not another vendor's.
 *
 * `isSingleVendor` tells the vendor UI whether this order is eligible for
 * the ready-for-delivery dispatch below - true only when every item in
 * the *whole* order (not just this vendor's slice) belongs to this same
 * store, since a delivery pickup can only be from one physical location.
 */
async function listMyOrders(req, res, next) {
  try {
    const store = await requireOwnStore(req, res);
    if (!store) return;
    const orders = await prisma.order.findMany({
      where: { items: { some: { product: { storeId: store.id } } } },
      include: {
        items: { where: { product: { storeId: store.id } }, include: { product: true } },
        user: { select: { id: true, name: true, phone: true } },
        deliveryAddress: true,
        deliveryRequest: { select: { id: true, status: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      orders: orders.map((order) => {
        const { _count, ...rest } = order;
        return { ...rest, isSingleVendor: _count.items === order.items.length };
      }),
    });
  } catch (err) {
    next(err);
  }
}

// Falls back to this when an admin hasn't set ModuleConfig("delivery").
// Mirrors restaurant/orders.controller.js's own DELIVERY_DEFAULT_FEE_CONFIG/
// estimateDeliveryPrice exactly, duplicated rather than imported since
// that module's version is private to it; both compute the same
// real-distance (or simulated-fallback) price for a pickup/dropoff pair.
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
 * Hands a ready single-vendor order off to the delivery module: creates a
 * DeliveryRequest (pickup = this store, dropoff = the order's delivery
 * address) with no assigned agent, so it appears on the same open job
 * board any package-delivery agent already sees - same integration
 * restaurant orders use (see dispatchForDelivery in
 * restaurant/orders.controller.js), no parallel dispatch system.
 */
async function dispatchForDelivery(order, store, ownerPhone) {
  if (!store.address || store.lat == null || store.lng == null) {
    throw Object.assign(new Error("Your store has no pickup address configured"), { status: 400 });
  }
  if (!order.deliveryAddress) {
    throw Object.assign(new Error("This order has no delivery address"), { status: 400 });
  }
  const feeConfig = await getModuleFeeConfig("delivery", DELIVERY_DEFAULT_FEE_CONFIG);
  const pickup = {
    pickupLat: store.lat,
    pickupLng: store.lng,
    dropoffLat: order.deliveryAddress.lat,
    dropoffLng: order.deliveryAddress.lng,
  };

  const deliveryRequest = await prisma.deliveryRequest.create({
    data: {
      userId: order.userId,
      senderName: store.name,
      senderPhone: ownerPhone,
      pickupAddress: store.address,
      pickupLat: store.lat,
      pickupLng: store.lng,
      receiverName: order.user.name || order.user.phone,
      receiverPhone: order.user.phone,
      dropoffAddress: `${order.deliveryAddress.label ? `${order.deliveryAddress.label} - ` : ""}${order.deliveryAddress.line1}, ${order.deliveryAddress.city}`,
      dropoffLat: order.deliveryAddress.lat,
      dropoffLng: order.deliveryAddress.lng,
      packageNote: `Ecommerce order from ${store.name} (#${order.id.slice(0, 8)})`,
      priceEstimate: estimateDeliveryPrice(pickup, feeConfig),
    },
  });

  return prisma.order.update({
    where: { id: order.id },
    data: { deliveryRequestId: deliveryRequest.id, status: "OUT_FOR_DELIVERY" },
    include: {
      items: { include: { product: true } },
      deliveryAddress: true,
      deliveryRequest: { select: { id: true, status: true } },
    },
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
 * Vendor walks their own order through CONFIRMED -> PREPARING ->
 * OUT_FOR_DELIVERY (or CANCELLED from either of the first two) - same
 * OWNER_TRANSITIONS shape as restaurant/orders.controller.js. Rejected
 * outright for a multi-vendor order (see isSingleVendor above): there is
 * no single pickup location to dispatch, and no other vendor's items
 * would be represented by this vendor alone marking it ready.
 */
async function updateOrderStatus(req, res, next) {
  try {
    const store = await requireOwnStore(req, res);
    if (!store) return;

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        user: true,
        deliveryAddress: true,
      },
    });
    if (!existing || !existing.items.some((item) => item.product.storeId === store.id)) {
      return res.status(404).json({ message: "Order not found" });
    }

    const storeIds = new Set(existing.items.map((item) => item.product.storeId));
    if (storeIds.size > 1) {
      return res.status(400).json({ message: "This order includes items from other sellers and can't be managed here" });
    }

    const { status } = updateOrderStatusSchema.parse(req.body);
    const allowed = OWNER_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot move an order from ${existing.status} to ${status}` });
    }

    if (status === "OUT_FOR_DELIVERY") {
      const order = await dispatchForDelivery(existing, store, req.user.phone);
      return res.json({ order });
    }

    const order = await prisma.order.update({
      where: { id: existing.id },
      data: { status },
      include: {
        items: { include: { product: true } },
        deliveryAddress: true,
        deliveryRequest: { select: { id: true, status: true } },
      },
    });
    res.json({ order });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

module.exports = {
  getStoreBySlug,
  listStores,
  getMyStore,
  createStore,
  updateStore,
  listMyProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  listMyOrders,
  updateOrderStatus,
};
