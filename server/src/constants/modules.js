// Canonical module registry for admin enable/disable + fee config (see
// ModuleConfig, server/src/modules/admin, and requireModuleEnabled in
// app.js). Keys match the server/src/modules/<key> directory boundaries -
// "mobile" covers both the airtime and bill-payment home-screen tiles
// since they share one backend module and Prisma model (MobileService).
const MODULE_KEYS = [
  { key: "ecommerce", label: "Ecommerce" },
  { key: "restaurant", label: "Restaurant" },
  { key: "delivery", label: "Delivery" },
  { key: "rideshare", label: "Ride Sharing" },
  { key: "insurance", label: "Insurance" },
  { key: "mobile", label: "Airtime & Bill Payment" },
  { key: "vendor", label: "Vendor Marketplace" },
  { key: "anando", label: "Anando" },
  { key: "wallet", label: "Wallet" },
];

module.exports = { MODULE_KEYS };
