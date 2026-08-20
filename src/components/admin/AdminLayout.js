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
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import useAuth from "../../hooks/useAuth";

export const DRAWER_WIDTH = 248;

/**
 * The admin back office's own desktop shell - a permanent sidebar (a
 * temporary/overlay drawer below the md breakpoint) plus a top bar with the
 * signed-in admin's identity and a logout menu, instead of the customer
 * app's phone-frame + bottom tab bar (see AppLayout.js's /admin escape
 * hatch). Deliberately visually distinct from the storefront - a dark
 * slate sidebar and denser spacing read as "back office", not "shop app".
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

  const nav = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2.5, gap: 1 }}>
        <AdminPanelSettingsRoundedIcon sx={{ color: "primary.light" }} />
        <Typography sx={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>{t("admin.title")}</Typography>
      </Toolbar>
      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {tabs.map((tabDef) => {
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
                mb: 0.5,
                color: selected ? "#fff" : "rgba(255,255,255,0.72)",
                "&.Mui-selected": { bgcolor: "primary.main" },
                "&.Mui-selected:hover": { bgcolor: "primary.main" },
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                <tabDef.icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t(tabDef.labelKey)}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F4F5F7" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: "#fff",
          color: "text.primary",
          borderBottom: "1px solid #EEEEEE",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" } }}>
            <MenuRoundedIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>
            {t(tabs.find((tabDef) => tabDef.id === activeTab)?.labelKey || "admin.title")}
          </Typography>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small">
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14, fontWeight: 700 }}>
              {(user?.name || user?.email || "A").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
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
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", bgcolor: "#151A23", border: 0 },
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
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", bgcolor: "#151A23" },
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
        <Box sx={{ maxWidth: 1280, mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
