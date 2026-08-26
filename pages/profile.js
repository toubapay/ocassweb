import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useMutation } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import SimCardRoundedIcon from "@mui/icons-material/SimCardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import TopBar from "../src/components/layout/TopBar";
import LanguageSwitcher from "../src/components/settings/LanguageSwitcher";
import useAuth from "../src/hooks/useAuth";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, logout, updateRole } = useAuth();

  const roleMutation = useMutation((role) => updateRole(role), {
    onSuccess: () => toast.success(t("profile.roleUpdated")),
    onError: () => toast.error(t("profile.couldNotUpdateRole")),
  });

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", px: 3, gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t("profile.notSignedIn")}
        </Typography>
        <Button variant="contained" onClick={() => router.push("/auth/login")} sx={{ fontWeight: 700, px: 4 }}>
          {t("common.logIn")}
        </Button>
        <LanguageSwitcher />
      </Box>
    );
  }

  // Store/restaurant ownership is independent of the self-serve `role`
  // toggle below (see server/src/middleware/auth.js requireStoreOwner) -
  // someone who owns a store keeps their "Commerçant" badge and "My
  // boutique" link even after switching their active role to e.g.
  // DELIVERY_AGENT, since the two are no longer the same flag. This is
  // what makes "client + vendor + livreur" all show at once instead of
  // forcing a single mutually-exclusive hat.
  const hasStore = Boolean(user?.store);
  const hasRestaurant = Boolean(user?.restaurant);
  const isAgent = user?.role === "DELIVERY_AGENT";
  const isRider = user?.role === "RIDER";
  const isAdmin = user?.role === "ADMIN";

  const badges = [
    { key: "client", label: t("profile.badges.client"), color: "default" },
    ...(hasStore ? [{ key: "vendor", label: t("profile.badges.vendor"), color: "success" }] : []),
    ...(hasRestaurant ? [{ key: "restaurant", label: t("profile.badges.restaurant"), color: "warning" }] : []),
    ...(isAgent ? [{ key: "agent", label: t("profile.badges.agent"), color: "info" }] : []),
    ...(isRider ? [{ key: "rider", label: t("profile.badges.rider"), color: "secondary" }] : []),
    ...(isAdmin ? [{ key: "admin", label: t("profile.badges.admin"), color: "error" }] : []),
  ];

  const links = [
    { label: t("profile.links.wallet"), icon: AccountBalanceWalletRoundedIcon, href: "/wallet" },
    ...(hasStore
      ? [{ label: t("profile.links.myBoutique"), icon: StorefrontRoundedIcon, href: "/vendor" }]
      : []),
    ...(hasRestaurant
      ? [{ label: t("profile.links.myRestaurant"), icon: RestaurantMenuRoundedIcon, href: "/restaurant/manage" }]
      : []),
    ...(isAgent
      ? [{ label: t("profile.agentDashboard"), icon: LocalShippingRoundedIcon, href: "/delivery/agent" }]
      : []),
    ...(isRider
      ? [{ label: t("profile.driverDashboard"), icon: DirectionsCarFilledRoundedIcon, href: "/ride-sharing/driver" }]
      : []),
    { label: t("profile.links.myOrders"), icon: ReceiptLongRoundedIcon, href: "/ecommerce/orders" },
    { label: t("profile.links.myFoodOrders"), icon: RestaurantRoundedIcon, href: "/restaurant/orders" },
    { label: t("profile.links.myWishlist"), icon: FavoriteRoundedIcon, href: "/ecommerce/wishlist" },
    { label: t("profile.links.deliveryRequests"), icon: LocalShippingRoundedIcon, href: "/delivery" },
    { label: t("profile.links.myRides"), icon: TwoWheelerRoundedIcon, href: "/ride-sharing" },
    { label: t("profile.links.myInsurancePolicies"), icon: HealthAndSafetyRoundedIcon, href: "/insurance" },
    { label: t("profile.links.topupsAndBills"), icon: SimCardRoundedIcon, href: "/topup" },
    ...(isAdmin ? [{ label: t("profile.links.admin"), icon: AdminPanelSettingsRoundedIcon, href: "/admin" }] : []),
  ];

  return (
    <Box>
      <TopBar title={t("nav.profile")} showBack={false} showSearch={false} showCart={false} />
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>
          {(user?.name || user?.phone || "?").charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {user?.name || t("profile.defaultName")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.75 }}>
            {user?.phone}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {badges.map((badge) => (
              <Chip key={badge.key} label={badge.label} color={badge.color} size="small" sx={{ fontWeight: 700 }} />
            ))}
          </Box>
        </Box>
      </Box>

      <List sx={{ px: 1 }}>
        {links.map((link) => (
          <ListItemButton key={link.href} onClick={() => router.push(link.href)} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <link.icon sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        ))}
        <ListItemButton onClick={logout} sx={{ borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutRoundedIcon sx={{ color: "error.main" }} />
          </ListItemIcon>
          <ListItemText primary={t("profile.logOut")} primaryTypographyProps={{ fontWeight: 600, color: "error.main" }} />
        </ListItemButton>
      </List>

      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", mb: 1 }}>
          {t("profile.workSectionTitle")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {!hasStore && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => router.push("/vendor/register")}
              sx={{ fontWeight: 700 }}
            >
              {t("profile.becomeVendor")}
            </Button>
          )}
          {!hasRestaurant && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => router.push("/restaurant/register")}
              sx={{ fontWeight: 700 }}
            >
              {t("profile.becomeRestaurantOwner")}
            </Button>
          )}
          {!isAgent && (
            <Button
              variant="outlined"
              size="small"
              disabled={roleMutation.isLoading}
              onClick={() => roleMutation.mutate("DELIVERY_AGENT")}
              sx={{ fontWeight: 700 }}
            >
              {t("profile.becomeAgent")}
            </Button>
          )}
          {!isRider && (
            <Button
              variant="outlined"
              size="small"
              disabled={roleMutation.isLoading}
              onClick={() => roleMutation.mutate("RIDER")}
              sx={{ fontWeight: 700 }}
            >
              {t("profile.becomeRider")}
            </Button>
          )}
          {(isAgent || isRider) && (
            <Button
              variant="text"
              size="small"
              disabled={roleMutation.isLoading}
              onClick={() => roleMutation.mutate("CUSTOMER")}
            >
              {t("profile.stopGigWork")}
            </Button>
          )}
        </Box>
      </Box>

      <LanguageSwitcher />
    </Box>
  );
}
