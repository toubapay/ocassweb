import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import SimCardRoundedIcon from "@mui/icons-material/SimCardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import TopBar from "../src/components/layout/TopBar";
import LanguageSwitcher from "../src/components/settings/LanguageSwitcher";
import useAuth from "../src/hooks/useAuth";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();

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

  const links = [
    { label: t("profile.links.wallet"), icon: AccountBalanceWalletRoundedIcon, href: "/wallet" },
    { label: t("profile.links.myOrders"), icon: ReceiptLongRoundedIcon, href: "/ecommerce/orders" },
    { label: t("profile.links.myFoodOrders"), icon: RestaurantRoundedIcon, href: "/restaurant/orders" },
    { label: t("profile.links.myWishlist"), icon: FavoriteRoundedIcon, href: "/ecommerce/wishlist" },
    { label: t("profile.links.deliveryRequests"), icon: LocalShippingRoundedIcon, href: "/delivery" },
    { label: t("profile.links.myRides"), icon: TwoWheelerRoundedIcon, href: "/ride-sharing" },
    { label: t("profile.links.myInsurancePolicies"), icon: HealthAndSafetyRoundedIcon, href: "/insurance" },
    { label: t("profile.links.topupsAndBills"), icon: SimCardRoundedIcon, href: "/topup" },
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
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {user?.phone}
          </Typography>
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

      <LanguageSwitcher />
    </Box>
  );
}
