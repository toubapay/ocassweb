const { Router } = require("express");
const { requireAuth, requireRestaurantOwner } = require("../../middleware/auth");
const {
  listRestaurants,
  getRestaurant,
  getMyRestaurant,
  createRestaurant,
  updateRestaurant,
  listMyMenuItems,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
} = require("./restaurant.controller");
const {
  listMyOrders,
  getMyOrder,
  createOrder,
  cancelOrder,
  listMyRestaurantOrders,
  updateOrderStatus,
} = require("./orders.controller");

const router = Router();

// Static routes must be registered before the "/:slug" catch-all below, or
// Express would match them as slug="orders" / slug="owner".
router.get("/orders", requireAuth, listMyOrders);
router.get("/orders/:id", requireAuth, getMyOrder);
router.patch("/orders/:id/cancel", requireAuth, cancelOrder);

// Creating a restaurant is the "become an owner" step itself, so it can't
// be gated on already owning one - createRestaurant self-guards against
// duplicates. Everything else requires actually owning a restaurant (see
// requireRestaurantOwner), which stays true regardless of the self-serve
// role toggle in profile.js - so an owner who later also becomes a rider
// doesn't lose access to their own restaurant.
router.post("/owner/restaurant", requireAuth, createRestaurant);
router.get("/owner/restaurant", requireAuth, requireRestaurantOwner, getMyRestaurant);
router.patch("/owner/restaurant", requireAuth, requireRestaurantOwner, updateRestaurant);

router.get("/owner/menu-items", requireAuth, requireRestaurantOwner, listMyMenuItems);
router.post("/owner/menu-items", requireAuth, requireRestaurantOwner, createMenuItem);
router.patch("/owner/menu-items/:id", requireAuth, requireRestaurantOwner, updateMenuItem);
router.delete("/owner/menu-items/:id", requireAuth, requireRestaurantOwner, deactivateMenuItem);

router.get("/owner/orders", requireAuth, requireRestaurantOwner, listMyRestaurantOrders);
router.patch("/owner/orders/:id/status", requireAuth, requireRestaurantOwner, updateOrderStatus);

router.get("/", listRestaurants);
router.get("/:slug", getRestaurant);
router.post("/:slug/orders", requireAuth, createOrder);

module.exports = router;
