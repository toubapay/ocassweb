import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import TopBar from "../../src/components/layout/TopBar";

export default function PaymentCancelled() {
  const router = useRouter();

  return (
    <Box>
      <TopBar title="Payment" showCart={false} showSearch={false} />
      <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CancelRoundedIcon sx={{ fontSize: 56, color: "text.secondary" }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Payment cancelled
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          You cancelled the checkout. Your cart is still saved.
        </Typography>
        <Button variant="contained" onClick={() => router.replace("/ecommerce/cart")}>
          Back to cart
        </Button>
      </Box>
    </Box>
  );
}
