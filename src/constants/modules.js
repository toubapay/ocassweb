import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";

// Central registry of the super-app's modules. Adding a module means adding
// one entry here plus its /pages/<id> route and (optionally) bottom nav entry.
export const MODULES = [
  {
    id: "ecommerce",
    label: "Shop",
    fullLabel: "Ecommerce",
    href: "/ecommerce",
    icon: ShoppingBagRoundedIcon,
    color: "#0FAE58",
    bg: "#E7F7EE",
    description: "Fashion, electronics, groceries & more",
  },
  {
    id: "restaurant",
    label: "Food",
    fullLabel: "Restaurant",
    href: "/restaurant",
    icon: RestaurantRoundedIcon,
    color: "#E5484D",
    bg: "#FDECEC",
    description: "Order from restaurants near you",
  },
  {
    id: "delivery",
    label: "Delivery",
    fullLabel: "Package Delivery",
    href: "/delivery",
    icon: LocalShippingRoundedIcon,
    color: "#FFB020",
    bg: "#FFF6E5",
    description: "Send a package across town",
  },
  {
    id: "ride-sharing",
    label: "Rides",
    fullLabel: "Ride Sharing",
    href: "/ride-sharing",
    icon: TwoWheelerRoundedIcon,
    color: "#3B82F6",
    bg: "#EAF2FE",
    description: "Book a moto, economy or comfort ride",
  },
  {
    id: "insurance",
    label: "Insurance",
    fullLabel: "Insurance",
    href: "/insurance",
    icon: HealthAndSafetyRoundedIcon,
    color: "#8B5CF6",
    bg: "#F2EEFE",
    description: "Health, auto, home & travel plans",
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
