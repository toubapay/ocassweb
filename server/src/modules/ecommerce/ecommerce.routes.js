const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listCategories } = require("./categories.controller");
const { listProducts, getProduct } = require("./products.controller");
const { getCart, addItem, updateItem, removeItem } = require("./cart.controller");
const { listOrders, createOrder } = require("./orders.controller");
const { listWishlist, toggleWishlist } = require("./wishlist.controller");

const router = Router();

router.get("/categories", listCategories);
router.get("/products", listProducts);
router.get("/products/:slug", getProduct);

router.get("/cart", requireAuth, getCart);
router.post("/cart", requireAuth, addItem);
router.patch("/cart/:id", requireAuth, updateItem);
router.delete("/cart/:id", requireAuth, removeItem);

router.get("/orders", requireAuth, listOrders);
router.post("/orders", requireAuth, createOrder);

router.get("/wishlist", requireAuth, listWishlist);
router.post("/wishlist/toggle", requireAuth, toggleWishlist);

module.exports = router;
