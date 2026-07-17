import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
export default function PaymentReturn() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState("checking");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function poll() {
      try {
        const payment = await fetchPaymentStatus(token);
        if (cancelled) return;
        if (payment.status === "COMPLETED") {
          setStatus("completed");
        } else if (payment.status === "CANCELLED" || payment.status === "FAILED") {
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

  return (
    <Box>
      <TopBar title="Payment" showCart={false} showSearch={false} />
      <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {status === "checking" && (
          <>
            <CircularProgress />
            <Typography sx={{ fontWeight: 700 }}>Confirming your payment...</Typography>
          </>
        )}
        {status === "completed" && (
          <>
            <CheckCircleRoundedIcon sx={{ fontSize: 56, color: "success.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Payment successful
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Your order has been confirmed.
            </Typography>
            <Button variant="contained" onClick={() => router.replace("/ecommerce/orders")}>
              View my orders
            </Button>
          </>
        )}
        {status === "pending" && (
          <>
            <HourglassTopRoundedIcon sx={{ fontSize: 56, color: "warning.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Payment still processing
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              We haven&apos;t received confirmation yet. Check your orders in a few minutes.
            </Typography>
            <Button variant="contained" onClick={() => router.replace("/ecommerce/orders")}>
              View my orders
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <ErrorRoundedIcon sx={{ fontSize: 56, color: "error.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Payment not completed
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Your payment could not be confirmed. You can try again from your cart.
            </Typography>
            <Button variant="contained" onClick={() => router.replace("/ecommerce/cart")}>
              Back to cart
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
