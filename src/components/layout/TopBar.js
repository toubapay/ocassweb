import { useRouter } from "next/router";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import { useQuery } from "react-query";
import { fetchCart } from "../../api/ecommerce";
import useAuth from "../../hooks/useAuth";

export default function TopBar({ title, showBack = true, showSearch = true, showCart = true, onSearchClick }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: cartItems } = useQuery("cart", fetchCart, {
    enabled: isAuthenticated && showCart,
  });
  const cartCount = (cartItems || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: "1px solid #EEEEEE", bgcolor: "background.paper" }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {showBack && (
          <IconButton edge="start" onClick={() => router.back()} size="small">
            <ArrowBackIosNewRoundedIcon fontSize="small" />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 18 }} noWrap>
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {showSearch && (
            <IconButton onClick={onSearchClick} size="small">
              <SearchRoundedIcon />
            </IconButton>
          )}
          {showCart && (
            <IconButton onClick={() => router.push("/ecommerce/cart")} size="small">
              <Badge badgeContent={cartCount} color="error">
                <ShoppingCartRoundedIcon sx={{ color: "primary.main" }} />
              </Badge>
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
