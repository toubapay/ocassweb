const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require("./address.controller");

const router = Router();
router.use(requireAuth);

// Not module-gated: an address belongs to the account, and it is what
// every module's delivery needs - turning the boutique off must not take
// a customer's saved addresses with it.
router.get("/addresses", listAddresses);
router.post("/addresses", createAddress);
router.patch("/addresses/:id", updateAddress);
router.delete("/addresses/:id", deleteAddress);

module.exports = router;
