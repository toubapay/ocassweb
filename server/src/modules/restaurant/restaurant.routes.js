const { Router } = require("express");
const { listRestaurants, getRestaurant } = require("./restaurant.controller");

const router = Router();

router.get("/", listRestaurants);
router.get("/:slug", getRestaurant);

module.exports = router;
