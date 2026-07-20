const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  getMyStore,
  createStore,
  updateStore,
  listMyProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  listMyOrders,
} = require("./vendor.controller");

const router = Router();
router.use(requireAuth, requireRole("VENDOR"));

router.get("/store", getMyStore);
router.post("/store", createStore);
router.patch("/store", updateStore);

router.get("/products", listMyProducts);
router.post("/products", createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deactivateProduct);

router.get("/orders", listMyOrders);

module.exports = router;
