const { z } = require("zod");
const walletService = require("./wallet.service");
const paymentsService = require("../payments/payments.service");

async function getWallet(req, res, next) {
  try {
    const wallet = await walletService.getOrCreateWallet(req.user.id);
    res.json({ wallet });
  } catch (err) {
    next(err);
  }
}

async function getTransactions(req, res, next) {
  try {
    const transactions = await walletService.listTransactions(req.user.id);
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

const topUpSchema = z.object({
  amount: z.number().positive(),
});

/** Starts a PayDunya invoice for WALLET_TOPUP; the wallet is credited once payments.service confirms it (IPN or return-page poll), same as an ecommerce order. */
async function topUp(req, res, next) {
  try {
    const { amount } = topUpSchema.parse(req.body);
    const wallet = await walletService.getOrCreateWallet(req.user.id);

    let payment;
    try {
      payment = await paymentsService.initiatePayment({
        userId: req.user.id,
        amount,
        purpose: "WALLET_TOPUP",
        purposeId: wallet.id,
        description: `Ocass wallet top-up`,
      });
    } catch (paymentErr) {
      return res.status(502).json({ message: "Could not start payment. Please try again." });
    }

    res.status(201).json({ paymentUrl: payment.checkoutUrl });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWallet, getTransactions, topUp };
