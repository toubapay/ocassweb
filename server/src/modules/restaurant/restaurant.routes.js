const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
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
  createOrder,
  cancelOrder,
  listMyRestaurantOrders,
  updateOrderStatus,
} = require("./orders.controller");

const router = Router();
const requireOwner = requireRole("RESTAURANT_OWNER");

// Static routes must be registered before the "/:slug" catch-all below, or
// Express would match them as slug="orders" / slug="owner".
router.get("/orders", requireAuth, listMyOrders);
router.patch("/orders/:id/cancel", requireAuth, cancelOrder);

router.get("/owner/restaurant", requireAuth, requireOwner, getMyRestaurant);
router.post("/owner/restaurant", requireAuth, requireOwner, createRestaurant);
router.patch("/owner/restaurant", requireAuth, requireOwner, updateRestaurant);

router.get("/owner/menu-items", requireAuth, requireOwner, listMyMenuItems);
router.post("/owner/menu-items", requireAuth, requireOwner, createMenuItem);
router.patch("/owner/menu-items/:id", requireAuth, requireOwner, updateMenuItem);
router.delete("/owner/menu-items/:id", requireAuth, requireOwner, deactivateMenuItem);

router.get("/owner/orders", requireAuth, requireOwner, listMyRestaurantOrders);
router.patch("/owner/orders/:id/status", requireAuth, requireOwner, updateOrderStatus);

router.get("/", listRestaurants);
router.get("/:slug", getRestaurant);
router.post("/:slug/orders", requireAuth, createOrder);

module.exports = router;
