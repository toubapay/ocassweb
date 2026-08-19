const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  getStoreBySlug,
  getMyStore,
  createStore,
  updateStore,
  listMyProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  createCategory,
  listMyOrders,
} = require("./vendor.controller");

const router = Router();

// Public - before the auth/role gate below, for shoppers browsing a
// vendor's storefront (see pages/store/[slug].js).
router.get("/stores/:slug", getStoreBySlug);

router.use(requireAuth, requireRole("VENDOR"));

router.get("/store", getMyStore);
router.post("/store", createStore);
router.patch("/store", updateStore);

router.get("/products", listMyProducts);
router.post("/products", createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deactivateProduct);

router.post("/categories", createCategory);

router.get("/orders", listMyOrders);

module.exports = router;
