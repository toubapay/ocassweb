const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { getModuleFeeConfig } = require("../../utils/feeConfig");

// Platform keeps the rest of each sale; the vendor's share is credited to
// the selling vendor's wallet - same "share" pattern as delivery/
// rideshare's agent/rider payout split, admin-configurable via
// ModuleConfig("vendor").feeConfig (see AdminModulesTab.js's fee editor).
const DEFAULT_FEE_CONFIG = {
  vendorSharePercent: 85,
};


/**
 * What this vendor keeps of a sale, as a fraction.
 *
 * Three levels, most specific first:
 *
 *   1. `Store.commissionPercent` - this shop's own rate, set by an admin.
 *   2. `User.commissionSharePercent` - the owner's personal rate. Kept as
 *      a fallback so vendors who already had one are not silently moved
 *      onto the default by this change.
 *   3. `ModuleConfig("vendor").feeConfig.vendorSharePercent`.
 *
 * Level 1 exists because level 2 is shared with delivery, rideshare,
 * Anando and restaurant payouts - and this app expects one person to do
 * several of those. Before it, setting a shop's cut to 90% also paid that
 * person 90% of every courier run they did.
 */
function resolveVendorShare(store, defaultShare) {
  if (store.commissionPercent != null) return Number(store.commissionPercent) / 100;
  if (store.owner?.commissionSharePercent != null) {
    return Number(store.owner.commissionSharePercent) / 100;
  }
  return defaultShare;
}

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
    include: {
      items: {
        include: { product: { include: { store: { include: { owner: { select: { commissionSharePercent: true } } } } } } },
      },
    },
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

  const feeConfig = await getModuleFeeConfig("vendor", DEFAULT_FEE_CONFIG);
  const defaultVendorShare = feeConfig.vendorSharePercent / 100;

  for (const { store, total } of byStore.values()) {
    const purposeId = `${orderId}:${store.id}`;
    const alreadyPaid = await prisma.walletTransaction.findFirst({
      where: { purpose: "VENDOR_SALE", purposeId },
    });
    if (alreadyPaid) continue;

    const vendorShare = resolveVendorShare(store, defaultVendorShare);
    // Whole francs: XOF has no subunit, and crediting 1 275.85 put a
    // figure in the wallet that no screen in the app can render honestly.
    // Guarded because credit() rejects a non-positive amount - a rounded
    // share of a tiny line total can be 0, and throwing here would undo
    // an order that is already paid.
    const amount = Math.round(total * vendorShare);
    if (amount <= 0) continue;

    await walletService.credit({
      userId: store.ownerId,
      amount,
      type: "EARNING",
      purpose: "VENDOR_SALE",
      purposeId,
      description: `Sale from order #${orderId.slice(0, 8)}`,
    });
  }
}

module.exports = { payoutVendorsForOrder, resolveVendorShare, DEFAULT_FEE_CONFIG };
