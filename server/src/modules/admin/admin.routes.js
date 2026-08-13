const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  listUsers,
  updateUser,
  listModules,
  updateModule,
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
} = require("./admin.controller");

const router = Router();

// Every route here is ADMIN-only.
router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", getStats);

router.get("/users", listUsers);
router.patch("/users/:id", updateUser);

router.get("/modules", listModules);
router.patch("/modules/:key", updateModule);

router.get("/zones", listZones);
router.post("/zones", createZone);
router.patch("/zones/:id", updateZone);
router.delete("/zones/:id", deleteZone);

router.get("/providers", listProviders);
router.post("/providers", createProvider);
router.patch("/providers/:id", updateProvider);
router.delete("/providers/:id", deleteProvider);

router.get("/services/mobile", listMobileServices);
router.post("/services/mobile", createMobileService);
router.patch("/services/mobile/:id", updateMobileService);

router.get("/services/insurance", listInsurancePlans);
router.post("/services/insurance", createInsurancePlan);
router.patch("/services/insurance/:id", updateInsurancePlan);

module.exports = router;
