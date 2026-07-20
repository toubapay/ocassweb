import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

const TABS = [
  { labelKey: "bottomNav.home", href: "/", icon: HomeRoundedIcon, match: (p) => p === "/" },
  {
    labelKey: "bottomNav.discover",
    href: "/ecommerce",
    icon: ExploreRoundedIcon,
    match: (p) => p.startsWith("/ecommerce") && !p.includes("orders") && !p.includes("cart"),
  },
  {
    labelKey: "bottomNav.orders",
    href: "/ecommerce/orders",
    icon: ReceiptLongRoundedIcon,
    match: (p) => p.includes("orders"),
  },
  { labelKey: "bottomNav.profile", href: "/profile", icon: PersonRoundedIcon, match: (p) => p === "/profile" },
];

export default function BottomNav() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentIndex = TABS.findIndex((tab) => tab.match(router.pathname));

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        borderTop: "1px solid #EEEEEE",
        zIndex: 20,
      }}
    >
      <BottomNavigation
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={(e, newIndex) => router.push(TABS[newIndex].href)}
        showLabels
        sx={{ height: 64 }}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.href}
            label={t(tab.labelKey)}
            icon={<tab.icon fontSize="small" />}
            sx={{
              "&.Mui-selected": { color: "primary.main" },
              minWidth: 0,
              px: 0.5,
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
