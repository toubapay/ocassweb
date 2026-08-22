const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
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
} = require("./admin.controller");

const router = Router();

// Every route here is ADMIN-only.
router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", getStats);

router.get("/users", listUsers);
router.patch("/users/:id", updateUser);

router.get("/modules", listModules);
router.patch("/modules/:key", updateModule);

router.get("/service-fees", listServiceFeeCatalog);
router.put("/service-fees", upsertServiceFeeConfig);

router.get("/vendors", listVendorStores);
router.patch("/vendors/:id", updateVendorStore);

router.get("/restaurants", listRestaurantsAdmin);
router.patch("/restaurants/:id", updateRestaurantAdmin);

router.get("/zones", listZones);
router.post("/zones", createZone);
router.patch("/zones/:id", updateZone);
router.delete("/zones/:id", deleteZone);

router.get("/categories", listCategoriesAdmin);
router.post("/categories", createCategoryAdmin);
router.patch("/categories/:id", updateCategoryAdmin);

router.get("/delivery-package-types", listDeliveryPackageTypesAdmin);
router.post("/delivery-package-types", createDeliveryPackageTypeAdmin);
router.patch("/delivery-package-types/:id", updateDeliveryPackageTypeAdmin);
router.delete("/delivery-package-types/:id", deleteDeliveryPackageTypeAdmin);

router.get("/providers", listProviders);
router.post("/providers", createProvider);
router.patch("/providers/:id", updateProvider);
router.delete("/providers/:id", deleteProvider);

router.get("/services/mobile", listMobileServices);
router.post("/services/mobile", createMobileService);
router.patch("/services/mobile/:id", updateMobileService);

router.get("/services/mobile-forfaits", listMobileForfaits);
router.post("/services/mobile-forfaits", createMobileForfait);
router.patch("/services/mobile-forfaits/:id", updateMobileForfait);

router.get("/services/insurance", listInsurancePlans);
router.post("/services/insurance", createInsurancePlan);
router.patch("/services/insurance/:id", updateInsurancePlan);

router.get("/insurance/auto-policies", listAutoInsurancePolicies);

module.exports = router;
