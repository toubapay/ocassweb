import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyVendorDeliveries } from "../../src/api/vendor";
import { useLiveStatus } from "../../src/components/live/LiveUpdatesProvider";
import { formatCfa } from "../../src/utils/currency";

// The run's own status changes reach the vendor on the live stream (every
// one files a notification, see delivery.notify.js), so this poll is the
// backstop - slower while the stream is up, same rule as everywhere else.
const POLL_MS = 20000;
const LIVE_POLL_MS = 120000;

// A delivery's status maps onto the shared chip vocabulary rather than
// widening it: "delivered" has to read as finished, not as pending.
const STATUS_COLOR = {
  REQUESTED: "default",
  ACCEPTED: "info",
  PICKED_UP: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
};

/**
 * Every courier run this shop raised, newest first.
 *
 * A vendor marking an order "out for delivery" dispatches a real run onto
 * the couriers' job board, and until this page that was the last they saw
 * of it: the run existed on the agents' board and in the admin console,
 * but the shop that raised it could not tell whether anyone had picked it
 * up - which is exactly what a customer rings them to ask.
 */
export default function VendorDeliveries() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { connected } = useLiveStatus();
  const isVendor = isAuthenticated && Boolean(user?.store);

  const { data: deliveries, isLoading } = useQuery(
    "vendor-deliveries",
    fetchMyVendorDeliveries,
    { enabled: isVendor, refetchInterval: connected ? LIVE_POLL_MS : POLL_MS }
  );

  if (!isVendor) {
    return (
      <Box>
        <TopBar title={t("vendor.deliveries")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("vendor.notAVendor")}</Typography>
          <Button variant="contained" onClick={() => router.push("/vendor")}>
            {t("vendor.title")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("vendor.deliveries")} showCart={false} showSearch={false} />

      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          {t("common.loading")}
        </Typography>
      )}

      {!isLoading && (deliveries || []).length === 0 && (
        <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
          <TwoWheelerRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">{t("vendor.noDeliveries")}</Typography>
        </Box>
      )}

      <Box sx={{ px: 2, pt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(deliveries || []).map((row) => {
          const run = row.deliveryRequest;
          return (
            <Box key={run.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.75 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {t("vendor.orderRef", { ref: row.id.slice(0, 8) })}
                </Typography>
                <Chip
                  size="small"
                  color={STATUS_COLOR[run.status] || "default"}
                  label={t(`delivery.status.${run.status}`, { defaultValue: run.status })}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {run.dropoffAddress}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                {row.user?.name || row.user?.phone}
                {run.distanceKm != null && ` · ${run.distanceKm.toFixed(1)} km`}
                {run.priceEstimate != null && ` · ${formatCfa(run.priceEstimate)}`}
              </Typography>

              {/* The courier's name and number, once one has taken it. A
                  vendor fielding "where is my parcel" had the status and
                  nothing else to answer with. */}
              {run.assignedAgent ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
                  <TwoWheelerRoundedIcon sx={{ fontSize: 17, color: "primary.main" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {run.assignedAgent.name || t("vendor.courier")}
                  </Typography>
                  <Button
                    size="small"
                    href={`tel:${run.assignedAgent.phone}`}
                    startIcon={<PhoneRoundedIcon sx={{ fontSize: 15 }} />}
                    sx={{ fontWeight: 700, minWidth: 0 }}
                  >
                    {run.assignedAgent.phone}
                  </Button>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 700, display: "block", mt: 1 }}>
                  {t("vendor.waitingForCourier")}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
