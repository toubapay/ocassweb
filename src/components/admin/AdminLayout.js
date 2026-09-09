import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import useAuth from "../../hooks/useAuth";

export const DRAWER_WIDTH = 264;

const SIDEBAR_BG = "#12161F";
const SIDEBAR_BG_ELEVATED = "#171C27";

/**
 * The admin back office's own desktop shell - a permanent sidebar (a
 * temporary/overlay drawer below the md breakpoint) plus a top bar with the
 * signed-in admin's identity and a logout menu, instead of the customer
 * app's phone-frame + bottom tab bar (see AppLayout.js's /admin escape
 * hatch). Deliberately visually distinct from the storefront - a dark
 * slate sidebar, grouped navigation, and card-based surfaces read as
 * "back office", not "shop app".
 */
export default function AdminLayout({ tabs, activeTab, onTabChange, children }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    router.push("/admin/login");
  };

  const groups = [];
  tabs.forEach((tabDef) => {
    const groupId = tabDef.group || "overview";
    let group = groups.find((g) => g.id === groupId);
    if (!group) {
      group = { id: groupId, items: [] };
      groups.push(group);
    }
    group.items.push(tabDef);
  });

  const activeTabDef = tabs.find((tabDef) => tabDef.id === activeTab);
  const initial = (user?.name || user?.email || "A").charAt(0).toUpperCase();

  const nav = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2.5, gap: 1.25, minHeight: "72px !important" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <StorefrontRoundedIcon sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: "#fff", fontSize: 16, lineHeight: 1.25 }} noWrap>
            Ocass
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 1.25 }} noWrap>
            {t("admin.title")}
          </Typography>
        </Box>
      </Toolbar>

      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1.5, pb: 2 }}>
        {groups.map((group) => (
          <Box key={group.id} sx={{ mb: 1.5 }}>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.32)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                px: 1.5,
                pt: 1.5,
                pb: 0.75,
              }}
            >
              {t(`admin.nav.${group.id}`)}
            </Typography>
            <List sx={{ py: 0 }}>
              {group.items.map((tabDef) => {
                const selected = activeTab === tabDef.id;
                return (
                  <ListItemButton
                    key={tabDef.id}
                    selected={selected}
                    onClick={() => {
                      onTabChange(tabDef.id);
                      setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: 2,
                      mb: 0.375,
                      pl: 1.25,
                      position: "relative",
                      color: selected ? "#fff" : "rgba(255,255,255,0.62)",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: 3,
                        borderRadius: "0 4px 4px 0",
                        bgcolor: "primary.main",
                        opacity: selected ? 1 : 0,
                        transition: "opacity 120ms ease",
                      },
                      "&.Mui-selected": { bgcolor: "rgba(15,174,88,0.16)" },
                      "&.Mui-selected:hover": { bgcolor: "rgba(15,174,88,0.22)" },
                      "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: selected ? "primary.light" : "inherit" }}>
                      <tabDef.icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t(tabDef.labelKey)}
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: selected ? 700 : 600 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <ListItemButton
          onClick={() => router.push("/")}
          sx={{
            borderRadius: 2,
            color: "rgba(255,255,255,0.62)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
            <ArrowBackRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t("admin.backToSite")} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F3F4F7" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: "#fff",
          color: "text.primary",
          borderBottom: "1px solid #ECEEF1",
          boxShadow: "0 1px 2px rgba(16,24,40,0.03)",
        }}
      >
        <Toolbar sx={{ gap: 1.25 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" } }}>
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.25 }} noWrap>
              {t(activeTabDef?.labelKey || "admin.title")}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 12.5, display: { xs: "none", sm: "block" } }} noWrap>
              {activeTabDef ? t(`admin.nav.${activeTabDef.group || "overview"}`) : t("admin.title")}
            </Typography>
          </Box>
          <Box
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              borderRadius: 2.5,
              py: 0.5,
              px: 1,
              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25 }} noWrap>
                {user?.name || t("admin.title")}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 11.5, lineHeight: 1.25 }} noWrap>
                {t("admin.administrator")}
              </Typography>
            </Box>
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14, fontWeight: 700 }}>
              {initial}
            </Avatar>
            <KeyboardArrowDownRoundedIcon sx={{ color: "text.secondary", fontSize: 20, display: { xs: "none", sm: "block" } }} />
          </Box>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem disabled sx={{ opacity: "1 !important" }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{user?.name || t("admin.title")}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
              {t("admin.logout")}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: SIDEBAR_BG,
            backgroundImage: `linear-gradient(180deg, ${SIDEBAR_BG_ELEVATED} 0%, ${SIDEBAR_BG} 280px)`,
            border: 0,
          },
        }}
      >
        {nav}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", bgcolor: SIDEBAR_BG },
        }}
      >
        {nav}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          pt: { xs: 9, md: 10 },
          px: { xs: 2, sm: 3, md: 4 },
          pb: 6,
        }}
      >
        <Box sx={{ maxWidth: 1320, mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
