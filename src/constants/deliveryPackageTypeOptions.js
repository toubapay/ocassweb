import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import DevicesOtherRoundedIcon from "@mui/icons-material/DevicesOtherRounded";
import LocalGroceryStoreRoundedIcon from "@mui/icons-material/LocalGroceryStoreRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import CheckroomRoundedIcon from "@mui/icons-material/CheckroomRounded";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";

// The package types themselves are admin-managed data now (DeliveryPackageType
// table, CRUD via AdminDeliveryPackageTypesTab.js / GET /delivery/package-types)
// rather than a fixed list - this file is just the rendering registry: fixed
// icon-name/colorKey choices an admin can pick from, and the lookup that turns
// a row's symbolic `icon`/`colorKey` strings into an actual icon component and
// hex pair. MUST stay in sync with DELIVERY_PACKAGE_TYPE_ICONS/_COLOR_KEYS in
// server/src/modules/admin/admin.controller.js (which validates against the
// same names) and the equivalent maps in mobile/lib/constants/delivery_package_types.dart.
export const DELIVERY_PACKAGE_TYPE_ICONS = {
  Inventory2Rounded: Inventory2RoundedIcon,
  DevicesOtherRounded: DevicesOtherRoundedIcon,
  LocalGroceryStoreRounded: LocalGroceryStoreRoundedIcon,
  DescriptionRounded: DescriptionRoundedIcon,
  CardGiftcardRounded: CardGiftcardRoundedIcon,
  LocalFloristRounded: LocalFloristRoundedIcon,
  CheckroomRounded: CheckroomRoundedIcon,
  MedicalServicesRounded: MedicalServicesRoundedIcon,
  LuggageRounded: LuggageRoundedIcon,
  BuildRounded: BuildRoundedIcon,
};

export const DELIVERY_PACKAGE_TYPE_COLORS = {
  slate: { color: "#1A1A1A", bg: "#F2F2F2" },
  blue: { color: "#3B82F6", bg: "#EAF2FE" },
  amber: { color: "#FFB020", bg: "#FFF6E5" },
  green: { color: "#0FAE58", bg: "#E7F7EE" },
  red: { color: "#E5484D", bg: "#FDECEC" },
  purple: { color: "#8B5CF6", bg: "#F2EEFE" },
  teal: { color: "#0D9488", bg: "#E6FBF8" },
  orange: { color: "#F97316", bg: "#FFF1E6" },
  pink: { color: "#EC4899", bg: "#FDF1F7" },
};

export function packageTypeIconComponent(iconName) {
  return DELIVERY_PACKAGE_TYPE_ICONS[iconName] || DELIVERY_PACKAGE_TYPE_ICONS.Inventory2Rounded;
}

export function packageTypeColors(colorKey) {
  return DELIVERY_PACKAGE_TYPE_COLORS[colorKey] || DELIVERY_PACKAGE_TYPE_COLORS.slate;
}
