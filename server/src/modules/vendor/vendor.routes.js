const { Router } = require("express");
const { requireAuth, requireStoreOwner } = require("../../middleware/auth");
const {
  getStoreBySlug,
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

// Public - before the auth gate below, for shoppers browsing a vendor's
// storefront (see pages/store/[slug].js).
router.get("/stores/:slug", getStoreBySlug);

router.use(requireAuth);

// Creating a store is the "become a vendor" step itself, so it can't be
// gated on already owning one - createStore self-guards against
// duplicates. Everything else requires actually owning a store (see
// requireStoreOwner), which stays true regardless of the self-serve role
// toggle in profile.js - so a vendor who later also becomes a delivery
// agent doesn't lose access to their own store.
router.post("/store", createStore);
router.use(requireStoreOwner);

router.get("/store", getMyStore);
router.patch("/store", updateStore);

router.get("/products", listMyProducts);
router.post("/products", createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deactivateProduct);

router.get("/orders", listMyOrders);

module.exports = router;
