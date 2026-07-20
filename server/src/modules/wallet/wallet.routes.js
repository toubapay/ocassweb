const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { getWallet, getTransactions, topUp } = require("./wallet.controller");

const router = Router();

router.use(requireAuth);
router.get("/", getWallet);
router.get("/transactions", getTransactions);
router.post("/topup", topUp);

module.exports = router;
