const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");

// Platform keeps this share of each sale; the rest is credited to the
// selling vendor's wallet - same "share" pattern as delivery/rideshare's
// agent/rider payout split, but not yet admin-configurable via
// ModuleConfig.feeConfig (that pass only covered the two modules with
// existing fee math to hook into; vendor commission would be a natural
// follow-up to admin.controller.js's Modules & fees tab).
const VENDOR_SHARE = 0.85;

/**
 * Credits each vendor whose products appear in this order their share of
 * those line items' total, once the order is confirmed paid (called from
 * both settlement paths: the synchronous wallet-payment branch in
 * orders.controller.js, and payments.service.js's PayDunya IPN handler).
 *
 * Idempotent per (order, store) via a WalletTransaction lookup rather
 * than a DB constraint - safe to call again if a webhook retries or a
 * client refetches, matching this app's existing app-level idempotency
 * pattern elsewhere (no unique constraint on WalletTransaction.purposeId
 * either). Orders containing products from an admin/seed-managed store
 * (`Store.ownerId: null`) are silently skipped for that store - there's
 * no vendor wallet to credit.
 */
async function payoutVendorsForOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { store: true } } } } },
  });
  if (!order) return;

  const byStore = new Map();
  for (const item of order.items) {
    const store = item.product.store;
    if (!store.ownerId) continue;
    const lineTotal = Number(item.price) * item.quantity;
    const entry = byStore.get(store.id) || { store, total: 0 };
    entry.total += lineTotal;
    byStore.set(store.id, entry);
  }

  for (const { store, total } of byStore.values()) {
    const purposeId = `${orderId}:${store.id}`;
    const alreadyPaid = await prisma.walletTransaction.findFirst({
      where: { purpose: "VENDOR_SALE", purposeId },
    });
    if (alreadyPaid) continue;

    await walletService.credit({
      userId: store.ownerId,
      amount: Math.round(total * VENDOR_SHARE * 100) / 100,
      type: "EARNING",
      purpose: "VENDOR_SALE",
      purposeId,
      description: `Sale from order #${orderId.slice(0, 8)}`,
    });
  }
}

module.exports = { payoutVendorsForOrder };
