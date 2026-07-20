import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import BottomNav from "./BottomNav";

// Pages that render their own fixed bottom action bar (add to cart, checkout,
// place order) hide the global tab bar so the two fixed elements don't overlap.
const FULL_SCREEN_PREFIXES = [
  "/auth",
  "/ecommerce/product",
  "/ecommerce/cart",
  "/ecommerce/checkout",
  // Restaurant detail shows its own fixed "Place order" bar once the cart
  // has items, which the global bottom nav would otherwise sit on top of.
  "/restaurant/[slug]",
];

export default function AppLayout({ children }) {
  const router = useRouter();
  const hideNav = FULL_SCREEN_PREFIXES.some((prefix) => router.pathname.startsWith(prefix));

  return (
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        boxShadow: { xs: "none", sm: "0 0 40px rgba(0,0,0,0.06)" },
      }}
    >
      <Box sx={{ pb: hideNav ? 0 : "72px" }}>{children}</Box>
      {!hideNav && <BottomNav />}
    </Box>
  );
}
