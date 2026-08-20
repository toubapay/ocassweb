const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  listServices,
  listForfaits,
  detectOperator,
  getFeeQuote,
  createTopup,
  createBillPayment,
  listMyTransactions,
} = require("./mobile.controller");

const router = Router();

router.get("/services", listServices);
router.get("/forfaits", listForfaits);
router.get("/detect-operator", detectOperator);
router.get("/fee-quote", getFeeQuote);
router.get("/transactions", requireAuth, listMyTransactions);
router.post("/topup", requireAuth, createTopup);
router.post("/bill-payment", requireAuth, createBillPayment);

module.exports = router;
