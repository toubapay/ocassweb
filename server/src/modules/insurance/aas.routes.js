const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  scanCarteGrise,
  getMetadata,
  compareAutoQuotes,
  purchaseAutoPolicy,
  retryAutoPolicy,
  cancelAutoPolicy,
  listAutoPolicies,
  getAutoPolicy,
} = require("./aas.controller");

const router = Router();

// A base64-encoded phone photo needs more than the default JSON body
// limit - see the raised global express.json() limit in app.js.
router.post("/carte-grise/scan", requireAuth, scanCarteGrise);

router.get("/metadata", getMetadata);
router.post("/compare", requireAuth, compareAutoQuotes);
router.get("/policies", requireAuth, listAutoPolicies);
router.post("/policies", requireAuth, purchaseAutoPolicy);
router.get("/policies/:id", requireAuth, getAutoPolicy);
router.post("/policies/:id/retry", requireAuth, retryAutoPolicy);
router.patch("/policies/:id/cancel", requireAuth, cancelAutoPolicy);

module.exports = router;
