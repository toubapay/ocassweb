import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import DevicesOtherRoundedIcon from "@mui/icons-material/DevicesOtherRounded";
import LocalGroceryStoreRoundedIcon from "@mui/icons-material/LocalGroceryStoreRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";

// What's being sent - purely informational (see DeliveryPackageType in
// schema.prisma), matching the category picker on the request form.
// "Restaurant" from the reference design isn't included here since Ocass
// already has a dedicated Restaurant module with its own order/dispatch
// flow - a generic courier "package type" duplicating that would be
// confusing, so Documents takes its place instead.
export const DELIVERY_PACKAGE_TYPES = [
  {
    key: "PACKAGE",
    icon: Inventory2RoundedIcon,
    color: "#1A1A1A",
    bg: "#F2F2F2",
  },
  {
    key: "ELECTRONICS",
    icon: DevicesOtherRoundedIcon,
    color: "#3B82F6",
    bg: "#EAF2FE",
  },
  {
    key: "FOOD",
    icon: LocalGroceryStoreRoundedIcon,
    color: "#FFB020",
    bg: "#FFF6E5",
  },
  {
    key: "DOCUMENT",
    icon: DescriptionRoundedIcon,
    color: "#0FAE58",
    bg: "#E7F7EE",
  },
];

export function packageTypeConfig(key) {
  return DELIVERY_PACKAGE_TYPES.find((p) => p.key === key) || DELIVERY_PACKAGE_TYPES[0];
}
