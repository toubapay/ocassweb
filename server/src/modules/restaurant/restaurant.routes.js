const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listRestaurants, getRestaurant } = require("./restaurant.controller");
const { listMyOrders, createOrder } = require("./orders.controller");

const router = Router();

// Static "/orders" must be registered before the "/:slug" catch-all below,
// or Express would match it as slug="orders".
router.get("/orders", requireAuth, listMyOrders);
router.get("/", listRestaurants);
router.get("/:slug", getRestaurant);
router.post("/:slug/orders", requireAuth, createOrder);

module.exports = router;
