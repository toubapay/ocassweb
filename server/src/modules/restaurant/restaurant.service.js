const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { getModuleFeeConfig } = require("../../utils/feeConfig");

// Platform keeps the rest of each order's total; the restaurant owner's
// share is credited to their wallet - same "share" pattern as vendor
// marketplace commission (vendor.service.js), admin-configurable via
// ModuleConfig("restaurant").feeConfig (see AdminModulesTab.js).
const DEFAULT_FEE_CONFIG = {
  ownerSharePercent: 85,
};

/**
 * Credits the restaurant owner their share of a paid order, once (called
 * right after the customer's wallet debit settles - see createOrder).
 * Idempotent via a WalletTransaction lookup rather than a DB constraint,
 * matching payoutVendorsForOrder's pattern. Orders against an admin/seed-
 * managed restaurant (`Restaurant.ownerId: null`) are silently skipped -
 * there's no owner wallet to credit.
 */
async function payoutOwnerForOrder(orderId) {
  const order = await prisma.restaurantOrder.findUnique({
    where: { id: orderId },
    include: { restaurant: true },
  });
  if (!order || !order.restaurant.ownerId) return;

  const purposeId = orderId;
  const alreadyPaid = await prisma.walletTransaction.findFirst({
    where: { purpose: "RESTAURANT_SALE", purposeId },
  });
  if (alreadyPaid) return;

  const feeConfig = await getModuleFeeConfig("restaurant", DEFAULT_FEE_CONFIG);
  const ownerShare = feeConfig.ownerSharePercent / 100;

  await walletService.credit({
    userId: order.restaurant.ownerId,
    // subtotal, not total - total now includes the platform's own
    // fee/TVA surcharge (ServiceFeeConfig, moduleKey "restaurant"), which
    // must never inflate the owner's share. See schema.prisma's
    // RestaurantOrder comment.
    amount: Math.round(Number(order.subtotal) * ownerShare * 100) / 100,
    type: "EARNING",
    purpose: "RESTAURANT_SALE",
    purposeId,
    description: `Order from ${order.restaurant.name} #${orderId.slice(0, 8)}`,
  });
}

module.exports = { payoutOwnerForOrder };
