import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import TopBar from "../../src/components/layout/TopBar";
import { fetchPaymentStatus } from "../../src/api/payments";

// PayDunya sends the customer back here after checkout. It's not safe to
// trust the redirect alone (the customer could land here without paying),
// so this page re-confirms the payment's real status with our backend,
// which in turn re-confirms with PayDunya's API before trusting it.
// This return page is shared by every PayDunya-backed flow (ecommerce
// checkout, wallet top-up, ...) since PayDunya only takes one return_url per
// invoice. The confirmed payment's `purpose` decides the wording and where
// "done" sends the customer next. Keyed by translation key rather than
// resolved text, since this table lives outside the component.
const DESTINATIONS = {
  WALLET_TOPUP: { labelKey: "payments.viewWallet", href: "/wallet", confirmedTextKey: "payments.walletCredited" },
};
const DEFAULT_DESTINATION = {
  labelKey: "payments.viewOrders",
  href: "/ecommerce/orders",
  confirmedTextKey: "payments.orderConfirmed",
};

export default function PaymentReturn() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token } = router.query;
  const [status, setStatus] = useState("checking");
  const [attempts, setAttempts] = useState(0);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function poll() {
      try {
        const result = await fetchPaymentStatus(token);
        if (cancelled) return;
        setPayment(result);
        if (result.status === "COMPLETED") {
          setStatus("completed");
        } else if (result.status === "CANCELLED" || result.status === "FAILED") {
          setStatus("failed");
        } else if (attempts < 4) {
          // PayDunya's IPN can lag behind the customer's browser redirect -
          // retry a few times before giving up and asking them to check later.
          setTimeout(() => setAttempts((n) => n + 1), 2000);
        } else {
          setStatus("pending");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [token, attempts]);

  const destination = DESTINATIONS[payment?.purpose] || DEFAULT_DESTINATION;

  return (
    <Box>
      <TopBar title={t("payments.title")} showCart={false} showSearch={false} />
      <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {status === "checking" && (
          <>
            <CircularProgress />
            <Typography sx={{ fontWeight: 700 }}>{t("payments.confirming")}</Typography>
          </>
        )}
        {status === "completed" && (
          <>
            <CheckCircleRoundedIcon sx={{ fontSize: 56, color: "success.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t("payments.successful")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t(destination.confirmedTextKey)}
            </Typography>
            <Button variant="contained" onClick={() => router.replace(destination.href)}>
              {t(destination.labelKey)}
            </Button>
          </>
        )}
        {status === "pending" && (
          <>
            <HourglassTopRoundedIcon sx={{ fontSize: 56, color: "warning.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t("payments.stillProcessing")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("payments.notReceivedYet")}
            </Typography>
            <Button variant="contained" onClick={() => router.replace(destination.href)}>
              {t(destination.labelKey)}
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <ErrorRoundedIcon sx={{ fontSize: 56, color: "error.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t("payments.notCompleted")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("payments.notCompletedSubtitle")}
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.replace(payment?.purpose === "WALLET_TOPUP" ? "/wallet" : "/ecommerce/cart")}
            >
              {payment?.purpose === "WALLET_TOPUP" ? t("payments.backToWallet") : t("payments.backToCart")}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
