import { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}h : ${m}m : ${s}s`;
}

/**
 * Counts down to `endsAt` (an ISO timestamp from an admin-configured
 * FlashSale campaign - see GET /ecommerce/flash-sales/active), i.e. the
 * end of today's occurrence of that campaign's recurring window.
 */
export default function FlashSaleCountdown({ endsAt }) {
  const target = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <Typography variant="caption" sx={{ fontWeight: 700, color: "#fff" }}>
      {formatDuration(remaining)}
    </Typography>
  );
}
