import { useRouter } from "next/router";
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
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import TopBar from "../src/components/layout/TopBar";
import useAuth from "../src/hooks/useAuth";

export default function Profile() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", px: 3, gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          You're not signed in
        </Typography>
        <Button variant="contained" onClick={() => router.push("/auth/login")} sx={{ fontWeight: 700, px: 4 }}>
          Log in
        </Button>
      </Box>
    );
  }

  const links = [
    { label: "My orders", icon: ReceiptLongRoundedIcon, href: "/ecommerce/orders" },
    { label: "My food orders", icon: RestaurantRoundedIcon, href: "/restaurant/orders" },
    { label: "My wishlist", icon: FavoriteRoundedIcon, href: "/ecommerce/wishlist" },
    { label: "Delivery requests", icon: LocalShippingRoundedIcon, href: "/delivery" },
    { label: "My rides", icon: TwoWheelerRoundedIcon, href: "/ride-sharing" },
    { label: "My insurance policies", icon: HealthAndSafetyRoundedIcon, href: "/insurance" },
    { label: "Top-ups & bills", icon: SimCardRoundedIcon, href: "/topup" },
  ];

  return (
    <Box>
      <TopBar title="Profile" showBack={false} showSearch={false} showCart={false} />
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>
          {(user?.name || user?.phone || "?").charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {user?.name || "Ocass user"}
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
          <ListItemText primary="Log out" primaryTypographyProps={{ fontWeight: 600, color: "error.main" }} />
        </ListItemButton>
      </List>
    </Box>
  );
}
