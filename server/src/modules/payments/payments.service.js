const prisma = require("../../lib/prisma");
const paydunya = require("./paydunya.service");
const walletService = require("../wallet/wallet.service");

/**
 * Creates a Payment record and a matching PayDunya invoice for it. Callers
 * (order/order-like creation flows) should link their own record's
 * paymentId to the returned Payment's id.
 */
async function initiatePayment({ userId, amount, purpose, purposeId, description }) {
  const payment = await prisma.payment.create({
    data: { userId, amount, purpose, purposeId, status: "PENDING" },
  });

  try {
    const { token, checkoutUrl } = await paydunya.createInvoice({
      amount,
      description,
      customData: { paymentId: payment.id, purpose, purposeId },
    });
    return prisma.payment.update({
      where: { id: payment.id },
      data: { providerToken: token, checkoutUrl },
    });
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw err;
  }
}

const STATUS_MAP = {
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  pending: "PENDING",
};

/**
 * The single source of truth for "did this payment actually go through" -
 * always re-confirms with PayDunya rather than trusting an IPN body or a
 * customer's return-URL visit at face value, per PayDunya's own guidance.
 */
async function syncPaymentStatus(token) {
  const payment = await prisma.payment.findUnique({ where: { providerToken: token } });
  if (!payment) return null;
  if (payment.status === "COMPLETED") return payment; // already settled, avoid re-applying side effects

  const confirmation = await paydunya.confirmInvoice(token);
  const mapped = STATUS_MAP[confirmation.status] || "PENDING";

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: mapped },
  });

  if (mapped === "COMPLETED") {
    await applyPaymentSideEffects(updated);
  }

  return updated;
}

/**
 * What happens when a payment settles, per what it was for. Add a case
 * here as PayDunya gets wired into more modules (restaurant orders,
 * mobile top-up/bills, insurance, delivery, rides).
 */
async function applyPaymentSideEffects(payment) {
  switch (payment.purpose) {
    case "ECOMMERCE_ORDER":
      await prisma.order.updateMany({
        where: { paymentId: payment.id },
        data: { paid: true, status: "CONFIRMED" },
      });
      break;
    case "WALLET_TOPUP":
      await walletService.credit({
        userId: payment.userId,
        amount: Number(payment.amount),
        type: "TOPUP",
        purpose: "WALLET_TOPUP",
        purposeId: payment.id,
        description: "PayDunya top-up",
      });
      break;
    default:
      break;
  }
}

module.exports = { initiatePayment, syncPaymentStatus };
