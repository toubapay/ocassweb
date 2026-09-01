const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { MODULE_KEYS } = require("../../constants/modules");
const { uniqueSlug } = require("../../utils/slugify");

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

// ---------------- Service fees & TVA ----------------
// Per-service commission/fee + tax overrides, separate from the earner-
// share splits in ModuleConfig.feeConfig above (vendorSharePercent etc.) -
// see the ServiceFeeConfig model comment in schema.prisma for why these
// don't interact. Only the three moduleKeys actually wired to charge this
// (see mobile.controller.js, ecommerce/orders.controller.js, restaurant/
// orders.controller.js) are supported here, same "don't build a decorative
// editor for something nothing reads" rule AdminModulesTab.js follows.

const SERVICE_FEE_CATALOGS = {
  mobile: async () => {
    const [services, forfaits] = await Promise.all([
      prisma.mobileService.findMany({ orderBy: { name: "asc" } }),
      prisma.mobileForfait.findMany({ include: { service: true }, orderBy: { name: "asc" } }),
    ]);
    return [
      ...services.map((s) => ({
        serviceType: "MobileService",
        serviceId: s.id,
        label: `${s.name} (${s.type === "AIRTIME" ? "Airtime" : "Bill"})`,
      })),
      ...forfaits.map((f) => ({
        serviceType: "MobileForfait",
        serviceId: f.id,
        label: `${f.name} - ${f.service.name}`,
      })),
    ];
  },
  ecommerce: async () => {
    const stores = await prisma.store.findMany({
      where: { ownerId: { not: null } },
      orderBy: { name: "asc" },
    });
    return stores.map((s) => ({ serviceType: "Store", serviceId: s.id, label: s.name }));
  },
  restaurant: async () => {
    const restaurants = await prisma.restaurant.findMany({
      where: { ownerId: { not: null } },
      orderBy: { name: "asc" },
    });
    return restaurants.map((r) => ({ serviceType: "Restaurant", serviceId: r.id, label: r.name }));
  },
};

/**
 * Merges the live catalog for one module (every MobileService/
 * MobileForfait/Store/Restaurant row) with any ServiceFeeConfig rows
 * already saved for it, so the admin UI always shows every service - even
 * ones nobody has configured a fee for yet - with sensible "off" defaults.
 */
async function listServiceFeeCatalog(req, res, next) {
  try {
    const moduleKey = String(req.query.moduleKey || "");
    const catalogFn = SERVICE_FEE_CATALOGS[moduleKey];
    if (!catalogFn) {
      return res.status(400).json({ message: "Unsupported module for service fees" });
    }

    const [services, configs] = await Promise.all([
      catalogFn(),
      prisma.serviceFeeConfig.findMany({ where: { moduleKey } }),
    ]);
    const byKey = new Map(configs.map((c) => [`${c.serviceType}:${c.serviceId}`, c]));

    const merged = services.map((s) => {
      const existing = byKey.get(`${s.serviceType}:${s.serviceId}`);
      return {
        moduleKey,
        serviceType: s.serviceType,
        serviceId: s.serviceId,
        label: s.label,
        feeEnabled: existing?.feeEnabled ?? false,
        feeType: existing?.feeType ?? "PERCENT",
        feeValue: existing ? Number(existing.feeValue) : 0,
        taxEnabled: existing?.taxEnabled ?? false,
        taxRatePercent: existing ? Number(existing.taxRatePercent) : 0,
      };
    });

    res.json({ services: merged });
  } catch (err) {
    next(err);
  }
}

const upsertServiceFeeSchema = z.object({
  moduleKey: z.enum(Object.keys(SERVICE_FEE_CATALOGS)),
  serviceType: z.enum(["MobileService", "MobileForfait", "Store", "Restaurant"]),
  serviceId: z.string().min(1),
  label: z.string().min(1),
  feeEnabled: z.boolean(),
  feeType: z.enum(["PERCENT", "FLAT"]),
  feeValue: z.number().min(0),
  taxEnabled: z.boolean(),
  taxRatePercent: z.number().min(0).max(100),
});

async function upsertServiceFeeConfig(req, res, next) {
  try {
    const data = upsertServiceFeeSchema.parse(req.body);
    const config = await prisma.serviceFeeConfig.upsert({
      where: {
        moduleKey_serviceType_serviceId: {
          moduleKey: data.moduleKey,
          serviceType: data.serviceType,
          serviceId: data.serviceId,
        },
      },
      update: data,
      create: data,
    });
    res.json({ config });
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

// ---------------- Categories (ecommerce product catalog) ----------------
// Any vendor can also create a category (POST /vendor/categories, always
// active, no parent restriction) - this section is what lets an admin
// additionally edit one (rename, re-parent, change icon) or take it down.
// No delete: existing Product rows reference a category by id, so isActive
// is the retire/hide lever, same as every other catalog entity in the app.

const categorySchema = z.object({
  name: z.string().min(2),
  parentId: z.string().uuid().optional().nullable(),
  icon: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

async function listCategoriesAdmin(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      include: { parent: { select: { id: true, name: true } }, _count: { select: { products: true } } },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

async function createCategoryAdmin(req, res, next) {
  try {
    const data = categorySchema.parse(req.body);
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) return res.status(400).json({ message: "Unknown parent category" });
    }
    const slug = await uniqueSlug(
      data.name,
      (s) => prisma.category.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        parentId: data.parentId || null,
        icon: data.icon || null,
        imageUrl: data.imageUrl || null,
      },
    });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

async function updateCategoryAdmin(req, res, next) {
  try {
    const data = categorySchema.partial().parse(req.body);
    if (data.parentId) {
      if (data.parentId === req.params.id) {
        return res.status(400).json({ message: "A category can't be its own parent" });
      }
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) return res.status(400).json({ message: "Unknown parent category" });
    }
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.parentId !== undefined ? { parentId: data.parentId || null } : {}),
        ...(data.icon !== undefined ? { icon: data.icon || null } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      },
    });
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

// ---------------- Delivery package types ----------------
// Admin-managed catalog of what a delivery can contain (see
// DeliveryPackageType in schema.prisma) - GET /delivery/package-types
// (public, delivery.controller.js) is what the request form's picker
// actually reads, so an admin can add/edit/retire types without a
// deploy. `icon`/`colorKey` are symbolic names, validated against the
// same fixed lists the web/Flutter clients use to resolve them to an
// actual icon+color - keeping this list in sync across all three is a
// manual convention (documented at each copy), same as elsewhere in the
// app (e.g. USER_ROLES, MODULE_KEYS).

const DELIVERY_PACKAGE_TYPE_ICONS = [
  "Inventory2Rounded",
  "DevicesOtherRounded",
  "LocalGroceryStoreRounded",
  "DescriptionRounded",
  "CardGiftcardRounded",
  "LocalFloristRounded",
  "CheckroomRounded",
  "MedicalServicesRounded",
  "LuggageRounded",
  "BuildRounded",
];

const DELIVERY_PACKAGE_TYPE_COLOR_KEYS = [
  "slate",
  "blue",
  "amber",
  "green",
  "red",
  "purple",
  "teal",
  "orange",
  "pink",
];

const packageTypeSchema = z.object({
  labelEn: z.string().min(2),
  labelFr: z.string().min(2),
  hintEn: z.string().optional(),
  hintFr: z.string().optional(),
  icon: z.enum(DELIVERY_PACKAGE_TYPE_ICONS),
  colorKey: z.enum(DELIVERY_PACKAGE_TYPE_COLOR_KEYS),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/** Generates a stable UPPER_SNAKE key from labelEn, e.g. "Gift Basket" -> "GIFT_BASKET". */
function packageTypeKey(text) {
  return (
    text
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "TYPE"
  );
}

async function uniquePackageTypeKey(base) {
  let key = packageTypeKey(base);
  let attempt = 0;
  while (await prisma.deliveryPackageType.findUnique({ where: { key } })) {
    attempt += 1;
    key = `${packageTypeKey(base)}_${attempt + 1}`;
    if (attempt > 10) throw new Error("Could not generate a unique package type key");
  }
  return key;
}

async function listDeliveryPackageTypesAdmin(req, res, next) {
  try {
    const packageTypes = await prisma.deliveryPackageType.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ packageTypes });
  } catch (err) {
    next(err);
  }
}

async function createDeliveryPackageTypeAdmin(req, res, next) {
  try {
    const data = packageTypeSchema.parse(req.body);
    const key = await uniquePackageTypeKey(data.labelEn);
    const packageType = await prisma.deliveryPackageType.create({ data: { ...data, key } });
    res.status(201).json({ packageType });
  } catch (err) {
    next(err);
  }
}

async function updateDeliveryPackageTypeAdmin(req, res, next) {
  try {
    const data = packageTypeSchema.partial().parse(req.body);
    const packageType = await prisma.deliveryPackageType.update({ where: { id: req.params.id }, data });
    res.json({ packageType });
  } catch (err) {
    next(err);
  }
}

async function deleteDeliveryPackageTypeAdmin(req, res, next) {
  try {
    const existing = await prisma.deliveryPackageType.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Package type not found" });
    const inUse = await prisma.deliveryRequest.count({ where: { packageType: existing.key } });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${inUse} delivery request(s) use this package type. Deactivate it instead.`,
      });
    }
    await prisma.deliveryPackageType.delete({ where: { id: req.params.id } });
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

const mobileForfaitSchema = z.object({
  serviceId: z.string().uuid(),
  category: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  callMinutesLabel: z.string().optional().or(z.literal("")),
  internetLabel: z.string().optional().or(z.literal("")),
  validityLabel: z.string().min(1),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function listMobileForfaits(req, res, next) {
  try {
    const { serviceId } = req.query;
    const forfaits = await prisma.mobileForfait.findMany({
      where: serviceId ? { serviceId: String(serviceId) } : undefined,
      include: { service: { select: { name: true } } },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { price: "asc" }],
    });
    res.json({ forfaits });
  } catch (err) {
    next(err);
  }
}

async function createMobileForfait(req, res, next) {
  try {
    const data = mobileForfaitSchema.parse(req.body);
    const forfait = await prisma.mobileForfait.create({
      data: { ...data, callMinutesLabel: data.callMinutesLabel || null, internetLabel: data.internetLabel || null },
    });
    res.status(201).json({ forfait });
  } catch (err) {
    next(err);
  }
}

async function updateMobileForfait(req, res, next) {
  try {
    const data = mobileForfaitSchema.partial().parse(req.body);
    const forfait = await prisma.mobileForfait.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.callMinutesLabel !== undefined ? { callMinutesLabel: data.callMinutesLabel || null } : {}),
        ...(data.internetLabel !== undefined ? { internetLabel: data.internetLabel || null } : {}),
      },
    });
    res.json({ forfait });
  } catch (err) {
    next(err);
  }
}

// Deliberately no delete endpoint, same reasoning as insurance plans below:
// a forfait with existing MobileTransaction rows can't be deleted without
// either orphaning or cascading those historical records. isActive is the
// retire/hide lever.
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

// Read-only ops visibility into AAS auto-insurance fulfillment - "a
// failed issuance records why" only helps if someone can actually see it.
// Optional ?status= filter (e.g. FAILED) since that's the case ops needs
// to triage; unfiltered defaults to the most recent 100 across all
// statuses.
async function listAutoInsurancePolicies(req, res, next) {
  try {
    const { status } = req.query;
    const policies = await prisma.insuranceAutoPolicy.findMany({
      where: status ? { status: String(status).toUpperCase() } : undefined,
      include: { user: { select: { id: true, phone: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ policies });
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
  listServiceFeeCatalog,
  upsertServiceFeeConfig,
  listVendorStores,
  updateVendorStore,
  listRestaurantsAdmin,
  updateRestaurantAdmin,
  listZones,
  createZone,
  updateZone,
  deleteZone,
  listCategoriesAdmin,
  createCategoryAdmin,
  updateCategoryAdmin,
  listDeliveryPackageTypesAdmin,
  createDeliveryPackageTypeAdmin,
  updateDeliveryPackageTypeAdmin,
  deleteDeliveryPackageTypeAdmin,
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  listMobileServices,
  createMobileService,
  updateMobileService,
  listMobileForfaits,
  createMobileForfait,
  updateMobileForfait,
  listInsurancePlans,
  createInsurancePlan,
  updateInsurancePlan,
  listAutoInsurancePolicies,
  getStats,
};
