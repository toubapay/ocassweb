const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { uniqueSlug } = require("../../utils/slugify");

async function requireOwnStore(req, res) {
  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) {
    res.status(400).json({ message: "Create your store first" });
    return null;
  }
  return store;
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
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyStore,
  createStore,
  updateStore,
  listMyProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  listMyOrders,
};
