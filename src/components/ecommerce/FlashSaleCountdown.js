import { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";

function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}h : ${m}m : ${s}s`;
}

/**
 * Counts down to the next local midnight. Not tied to any real deal-
 * expiry/inventory data - this app has no such concept - so this is a
 * "today's steepest discounts" framing rather than a claim that specific
 * deals disappear at zero. Ties to the same `sort=discount` product set
 * the flash-sale row already fetches, so what's actually shown does
 * change day to day as products/discounts change.
 */
export default function FlashSaleCountdown() {
  const [remaining, setRemaining] = useState(msUntilNextMidnight());

  useEffect(() => {
    const timer = setInterval(() => setRemaining(msUntilNextMidnight()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Typography variant="caption" sx={{ fontWeight: 700, color: "#fff" }}>
      {formatDuration(remaining)}
    </Typography>
  );
}
