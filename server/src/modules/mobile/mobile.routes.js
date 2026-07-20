const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  listServices,
  detectOperator,
  createTopup,
  createBillPayment,
  listMyTransactions,
} = require("./mobile.controller");

const router = Router();

router.get("/services", listServices);
router.get("/detect-operator", detectOperator);
router.get("/transactions", requireAuth, listMyTransactions);
router.post("/topup", requireAuth, createTopup);
router.post("/bill-payment", requireAuth, createBillPayment);

module.exports = router;
