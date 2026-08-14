const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { uniqueSlug } = require("../../utils/slugify");

// ---------------- Public browsing ----------------

async function listRestaurants(req, res, next) {
  try {
    const { search } = req.query;
    const restaurants = await prisma.restaurant.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: String(search), mode: "insensitive" } } : {}),
      },
      orderBy: { rating: "desc" },
    });
    res.json({ restaurants });
  } catch (err) {
    next(err);
  }
}

// Returns the restaurant even when suspended (isActive: false) - the
// detail page uses that flag to show an "unavailable" state distinct from
// "doesn't exist" (same pattern as vendor's getStoreBySlug), rather than a
// blanket 404 that reads like a broken link.
async function getRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: req.params.slug },
      include: { menuItems: { where: { isActive: true } } },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

// ---------------- Owner self-service ----------------
// Mirrors vendor.controller.js's Store pattern: one restaurant per owner,
// self-service create/edit, menu items scoped to "my restaurant" the same
// way products are scoped to "my store".

async function requireOwnRestaurant(req, res) {
  const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: req.user.id } });
  if (!restaurant) {
    res.status(400).json({ message: "Create your restaurant first" });
    return null;
  }
  return restaurant;
}

async function getMyRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: req.user.id } });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

const restaurantSchema = z.object({
  name: z.string().min(2),
  cuisine: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

async function createRestaurant(req, res, next) {
  try {
    const data = restaurantSchema.parse(req.body);
    const existing = await prisma.restaurant.findUnique({ where: { ownerId: req.user.id } });
    if (existing) {
      return res.status(409).json({ message: "You already have a restaurant" });
    }
    const slug = await uniqueSlug(
      data.name,
      (s) => prisma.restaurant.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const restaurant = await prisma.restaurant.create({
      data: { ...data, logoUrl: data.logoUrl || null, slug, ownerId: req.user.id },
    });
    res.status(201).json({ restaurant });
  } catch (err) {
    next(err);
  }
}

const updateRestaurantSchema = restaurantSchema.partial();

async function updateRestaurant(req, res, next) {
  try {
    const existing = await requireOwnRestaurant(req, res);
    if (!existing) return;
    const data = updateRestaurantSchema.parse(req.body);
    const restaurant = await prisma.restaurant.update({
      where: { id: existing.id },
      data: { ...data, logoUrl: data.logoUrl === "" ? null : data.logoUrl },
    });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

async function listMyMenuItems(req, res, next) {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { name: "asc" },
    });
    res.json({ menuItems });
  } catch (err) {
    next(err);
  }
}

const menuItemSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
});

async function createMenuItem(req, res, next) {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;
    const data = menuItemSchema.parse(req.body);
    const menuItem = await prisma.menuItem.create({
      data: { ...data, imageUrl: data.imageUrl || null, restaurantId: restaurant.id },
    });
    res.status(201).json({ menuItem });
  } catch (err) {
    next(err);
  }
}

const updateMenuItemSchema = menuItemSchema.partial().extend({
  isActive: z.boolean().optional(),
});

async function updateMenuItem(req, res, next) {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;
    const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.restaurantId !== restaurant.id) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    const data = updateMenuItemSchema.parse(req.body);
    const menuItem = await prisma.menuItem.update({
      where: { id: existing.id },
      data: { ...data, imageUrl: data.imageUrl === "" ? null : data.imageUrl },
    });
    res.json({ menuItem });
  } catch (err) {
    next(err);
  }
}

/** Soft delete - flips isActive off rather than removing the row, since
 * existing order line items reference it by id. */
async function deactivateMenuItem(req, res, next) {
  try {
    const restaurant = await requireOwnRestaurant(req, res);
    if (!restaurant) return;
    const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.restaurantId !== restaurant.id) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    const menuItem = await prisma.menuItem.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    res.json({ menuItem });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRestaurants,
  getRestaurant,
  requireOwnRestaurant,
  getMyRestaurant,
  createRestaurant,
  updateRestaurant,
  listMyMenuItems,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
};
