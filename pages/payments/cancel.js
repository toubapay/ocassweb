import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import TopBar from "../../src/components/layout/TopBar";

export default function PaymentCancelled() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Box>
      <TopBar title={t("payments.title")} showCart={false} showSearch={false} />
      <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CancelRoundedIcon sx={{ fontSize: 56, color: "text.secondary" }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t("payments.cancelled")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("payments.cancelledSubtitle")}
        </Typography>
        <Button variant="contained" onClick={() => router.replace("/ecommerce/cart")}>
          {t("payments.backToCart")}
        </Button>
      </Box>
    </Box>
  );
}
