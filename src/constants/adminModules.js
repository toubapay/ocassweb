// Mirrors server/src/constants/modules.js's MODULE_KEYS - kept in sync by
// hand since the web bundle can't import server-side source. Used by the
// admin zones tab's module picker (see AdminZonesTab.js).
export const MODULE_OPTIONS = [
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
