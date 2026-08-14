const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { MODULE_KEYS } = require("../../constants/modules");

// ---------------- Users ----------------

const USER_ROLES = ["CUSTOMER", "VENDOR", "RESTAURANT_OWNER", "RIDER", "DELIVERY_AGENT", "ADMIN"];

async function listUsers(req, res, next) {
  try {
    const { q, role, page = "1", pageSize = "20" } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      ...(role ? { role: String(role).toUpperCase() } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: String(q), mode: "insensitive" } },
              { phone: { contains: String(q) } },
              { email: { contains: String(q), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: Number(page) || 1, pageSize: take });
  } catch (err) {
    next(err);
  }
}

const updateUserSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  active: z.boolean().optional(),
});

async function updateUser(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);
    if (req.params.id === req.user.id && data.active === false) {
      return res.status(400).json({ message: "You can't deactivate your own account" });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ---------------- Modules & fees ----------------

/**
 * Upserts any module key missing from ModuleConfig. Runs on every list
 * call rather than only from a seed script, so a module added to
 * MODULE_KEYS after this table was first populated (or a database that
 * never ran the seed at all, like a fresh production deploy) still shows
 * every module instead of silently omitting it from the admin UI.
 */
async function ensureModuleDefaults() {
  await prisma.moduleConfig.createMany({
    data: MODULE_KEYS.map((m) => ({ key: m.key, label: m.label })),
    skipDuplicates: true,
  });
}

async function listModules(req, res, next) {
  try {
    await ensureModuleDefaults();
    const modules = await prisma.moduleConfig.findMany({ orderBy: { key: "asc" } });
    res.json({ modules });
  } catch (err) {
    next(err);
  }
}

const updateModuleSchema = z.object({
  enabled: z.boolean().optional(),
  // Shape is module-specific (see delivery.controller.js / rideshare.
  // controller.js's DEFAULT_FEE_CONFIG) - validated loosely here, not
  // against a per-module schema, so the fee editor stays flexible.
  feeConfig: z.record(z.any()).nullable().optional(),
});

async function updateModule(req, res, next) {
  try {
    const data = updateModuleSchema.parse(req.body);
    const known = MODULE_KEYS.some((m) => m.key === req.params.key);
    if (!known) {
      return res.status(404).json({ message: "Unknown module key" });
    }
    await ensureModuleDefaults();
    const module_ = await prisma.moduleConfig.update({
      where: { key: req.params.key },
      data,
    });
    res.json({ module: module_ });
  } catch (err) {
    next(err);
  }
}

// ---------------- Vendors ----------------

async function listVendorStores(req, res, next) {
  try {
    const { q, page = "1", pageSize = "20" } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      // Admin/seed-managed stores have no owner and nothing to suspend -
      // this tab is for actual vendor-owned stores.
      ownerId: { not: null },
      ...(q
        ? {
            OR: [
              { name: { contains: String(q), mode: "insensitive" } },
              { owner: { name: { contains: String(q), mode: "insensitive" } } },
              { owner: { phone: { contains: String(q) } } },
            ],
          }
        : {}),
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, phone: true } },
          _count: { select: { products: true } },
        },
        orderBy: { name: "asc" },
        take,
        skip,
      }),
      prisma.store.count({ where }),
    ]);

    res.json({ stores, total, page: Number(page) || 1, pageSize: take });
  } catch (err) {
    next(err);
  }
}

const updateVendorStoreSchema = z.object({
  isActive: z.boolean(),
});

async function updateVendorStore(req, res, next) {
  try {
    const data = updateVendorStoreSchema.parse(req.body);
    const store = await prisma.store.update({
      where: { id: req.params.id },
      data,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        _count: { select: { products: true } },
      },
    });
    res.json({ store });
  } catch (err) {
    next(err);
  }
}

// ---------------- Restaurants ----------------

async function listRestaurantsAdmin(req, res, next) {
  try {
    const { q, page = "1", pageSize = "20" } = req.query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      // Admin/seed-managed restaurants have no owner and nothing to
      // suspend - this tab is for actual owner-run restaurants.
      ownerId: { not: null },
      ...(q
        ? {
            OR: [
              { name: { contains: String(q), mode: "insensitive" } },
              { owner: { name: { contains: String(q), mode: "insensitive" } } },
              { owner: { phone: { contains: String(q) } } },
            ],
          }
        : {}),
    };

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, phone: true } },
          _count: { select: { menuItems: true, orders: true } },
        },
        orderBy: { name: "asc" },
        take,
        skip,
      }),
      prisma.restaurant.count({ where }),
    ]);

    res.json({ restaurants, total, page: Number(page) || 1, pageSize: take });
  } catch (err) {
    next(err);
  }
}

const updateRestaurantAdminSchema = z.object({
  isActive: z.boolean(),
});

async function updateRestaurantAdmin(req, res, next) {
  try {
    const data = updateRestaurantAdminSchema.parse(req.body);
    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        _count: { select: { menuItems: true, orders: true } },
      },
    });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

// ---------------- Service zones (Google Maps) ----------------

const pointSchema = z.object({ lat: z.number(), lng: z.number() });
const zoneSchema = z.object({
  name: z.string().min(2),
  moduleKey: z.string().min(2),
  boundary: z.array(pointSchema).min(3, "A zone needs at least 3 points"),
  feeMultiplier: z.number().positive().nullable().optional(),
  active: z.boolean().optional(),
});

async function listZones(req, res, next) {
  try {
    const { moduleKey } = req.query;
    const zones = await prisma.serviceZone.findMany({
      where: moduleKey ? { moduleKey: String(moduleKey) } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
}

async function createZone(req, res, next) {
  try {
    const data = zoneSchema.parse(req.body);
    const zone = await prisma.serviceZone.create({ data });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
}

async function updateZone(req, res, next) {
  try {
    const data = zoneSchema.partial().parse(req.body);
    const zone = await prisma.serviceZone.update({ where: { id: req.params.id }, data });
    res.json({ zone });
  } catch (err) {
    next(err);
  }
}

async function deleteZone(req, res, next) {
  try {
    await prisma.serviceZone.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ---------------- Providers (SMS gateway, and other services) ----------------

const providerSchema = z.object({
  category: z.string().min(2),
  name: z.string().min(2),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  // Freeform - see server/src/utils/smsGateway.js for the request-template
  // shape category "SMS" reads out of this.
  config: z.record(z.any()),
});

async function listProviders(req, res, next) {
  try {
    const { category } = req.query;
    const providers = await prisma.provider.findMany({
      where: category ? { category: String(category) } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json({ providers });
  } catch (err) {
    next(err);
  }
}

/**
 * At most one default provider per category - if this write sets
 * isDefault true, clear it on every other provider in the same category
 * first so "the" default is unambiguous for smsGateway.js's lookup.
 */
async function clearOtherDefaults(category, exceptId) {
  await prisma.provider.updateMany({
    where: { category, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { isDefault: false },
  });
}

async function createProvider(req, res, next) {
  try {
    const data = providerSchema.parse(req.body);
    const provider = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.provider.updateMany({
          where: { category: data.category, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.provider.create({ data });
    });
    res.status(201).json({ provider });
  } catch (err) {
    next(err);
  }
}

async function updateProvider(req, res, next) {
  try {
    const data = providerSchema.partial().parse(req.body);
    const provider = await prisma.$transaction(async (tx) => {
      const existing = await tx.provider.findUniqueOrThrow({ where: { id: req.params.id } });
      if (data.isDefault) {
        await tx.provider.updateMany({
          where: { category: data.category || existing.category, isDefault: true, id: { not: existing.id } },
          data: { isDefault: false },
        });
      }
      return tx.provider.update({ where: { id: existing.id }, data });
    });
    res.json({ provider });
  } catch (err) {
    next(err);
  }
}

async function deleteProvider(req, res, next) {
  try {
    await prisma.provider.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ---------------- Services catalog (mobile top-up/bill + insurance) ----------------

const mobileServiceSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().optional().or(z.literal("")),
  type: z.enum(["AIRTIME", "BILL"]),
  billCategory: z.enum(["ELECTRICITY", "WATER", "TV", "INTERNET"]).optional(),
  phonePrefixes: z.array(z.string()).optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

async function listMobileServices(req, res, next) {
  try {
    const services = await prisma.mobileService.findMany({ orderBy: { name: "asc" } });
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

async function createMobileService(req, res, next) {
  try {
    const data = mobileServiceSchema.parse(req.body);
    const service = await prisma.mobileService.create({
      data: { ...data, logoUrl: data.logoUrl || null },
    });
    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
}

async function updateMobileService(req, res, next) {
  try {
    const data = mobileServiceSchema.partial().parse(req.body);
    const service = await prisma.mobileService.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}) },
    });
    res.json({ service });
  } catch (err) {
    next(err);
  }
}

const insurancePlanSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["HEALTH", "AUTO", "HOME", "TRAVEL", "LIFE"]),
  provider: z.string().min(2),
  premiumMonthly: z.number().positive(),
  coverageAmount: z.number().positive(),
  description: z.string().optional(),
});

async function listInsurancePlans(req, res, next) {
  try {
    const plans = await prisma.insurancePlan.findMany({ orderBy: { name: "asc" } });
    res.json({ plans });
  } catch (err) {
    next(err);
  }
}

async function createInsurancePlan(req, res, next) {
  try {
    const data = insurancePlanSchema.parse(req.body);
    const plan = await prisma.insurancePlan.create({ data });
    res.status(201).json({ plan });
  } catch (err) {
    next(err);
  }
}

// Deliberately no delete endpoint: InsurancePolicy rows reference a plan
// by id with no ON DELETE behavior configured, so removing a plan with
// existing policies would fail a FK constraint. Editing (including
// discontinuing via the fields above) covers the real admin need without
// having to design a soft-delete/reassignment flow for policies.
async function updateInsurancePlan(req, res, next) {
  try {
    const data = insurancePlanSchema.partial().parse(req.body);
    const plan = await prisma.insurancePlan.update({ where: { id: req.params.id }, data });
    res.json({ plan });
  } catch (err) {
    next(err);
  }
}

// ---------------- Dashboard stats ----------------

async function getStats(req, res, next) {
  try {
    const [
      totalUsers,
      usersByRole,
      totalOrders,
      pendingDeliveries,
      activeRides,
      totalStores,
      totalRidePostings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
      prisma.order.count(),
      prisma.deliveryRequest.count({ where: { status: { in: ["REQUESTED", "ACCEPTED", "PICKED_UP"] } } }),
      prisma.rideRequest.count({ where: { status: { in: ["REQUESTED", "ACCEPTED", "IN_PROGRESS"] } } }),
      prisma.store.count(),
      prisma.ridePosting.count({ where: { status: "OPEN" } }),
    ]);

    res.json({
      totalUsers,
      usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count.role])),
      totalOrders,
      pendingDeliveries,
      activeRides,
      totalStores,
      totalRidePostings,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  updateUser,
  listModules,
  updateModule,
  listVendorStores,
  updateVendorStore,
  listRestaurantsAdmin,
  updateRestaurantAdmin,
  listZones,
  createZone,
  updateZone,
  deleteZone,
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  listMobileServices,
  createMobileService,
  updateMobileService,
  listInsurancePlans,
  createInsurancePlan,
  updateInsurancePlan,
  getStats,
};
