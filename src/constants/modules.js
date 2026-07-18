import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import PhoneAndroidRoundedIcon from "@mui/icons-material/PhoneAndroidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

// Central registry of the super-app's modules. Adding a module means adding
// one entry here plus its /pages/<id> route, (optionally) a bottom nav
// entry, and a `modules.<id>.{label,fullLabel,description}` entry in both
// locale files (src/i18n/locales) - labels are looked up by id at render
// time (see ModuleTile.js) rather than stored here, so they stay in sync
// with the active language.
export const MODULES = [
  {
    id: "ecommerce",
    href: "/ecommerce",
    icon: ShoppingBagRoundedIcon,
    color: "#0FAE58",
    bg: "#E7F7EE",
  },
  {
    id: "restaurant",
    href: "/restaurant",
    icon: RestaurantRoundedIcon,
    color: "#E5484D",
    bg: "#FDECEC",
  },
  {
    id: "delivery",
    href: "/delivery",
    icon: LocalShippingRoundedIcon,
    color: "#FFB020",
    bg: "#FFF6E5",
  },
  {
    id: "ride-sharing",
    href: "/ride-sharing",
    icon: TwoWheelerRoundedIcon,
    color: "#3B82F6",
    bg: "#EAF2FE",
  },
  {
    id: "insurance",
    href: "/insurance",
    icon: HealthAndSafetyRoundedIcon,
    color: "#8B5CF6",
    bg: "#F2EEFE",
  },
  {
    id: "airtime",
    href: "/topup?tab=airtime",
    icon: PhoneAndroidRoundedIcon,
    color: "#0D9488",
    bg: "#E6FBF8",
  },
  {
    id: "bill-payment",
    href: "/topup?tab=bill",
    icon: ReceiptLongRoundedIcon,
    color: "#F97316",
    bg: "#FFF1E6",
  },
];

export const getModule = (id) => MODULES.find((m) => m.id === id);

// Rebuilds MODULES in a user-customized order (persisted list of ids).
// Falls back to the default order, and appends any module missing from a
// stale saved order (e.g. a module added after the user last reordered).
export const getOrderedModules = (order) => {
  if (!order || order.length === 0) return MODULES;
  const byId = new Map(MODULES.map((m) => [m.id, m]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  const missing = MODULES.filter((m) => !order.includes(m.id));
  return [...ordered, ...missing];
};
