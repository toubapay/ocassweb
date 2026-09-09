import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import TopBar from "../../../src/components/layout/TopBar";
import LiveTrackingMap from "../../../src/components/maps/LiveTrackingMap";
import useAuth from "../../../src/hooks/useAuth";
import { fetchRide } from "../../../src/api/modules";
import { haversineDistanceKm } from "../../../src/utils/geo";
import { formatCfa } from "../../../src/utils/currency";

const STEPS = ["REQUESTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];
const POLL_MS = 5000;

function StatusTrack({ status, t }) {
  const stepIndex = status === "CANCELLED" ? -1 : STEPS.indexOf(status);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
      {STEPS.map((step, i) => (
        <Box key={step} sx={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "0 0 auto" }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: i <= stepIndex ? "primary.main" : "grey.300",
            }}
          />
          {i < STEPS.length - 1 && (
            <Box sx={{ flex: 1, height: 2, bgcolor: i < stepIndex ? "primary.main" : "grey.300", mx: 0.5 }} />
          )}
        </Box>
      ))}
      <Typography variant="caption" sx={{ ml: 1, fontWeight: 700, whiteSpace: "nowrap" }}>
        {t(`rideSharing.status.${status}`, { defaultValue: status })}
      </Typography>
    </Box>
  );
}

/**
 * Customer-facing tracking page for one ride request, mirroring
 * pages/delivery/track/[id].js's structure (status stepper, live map,
 * assigned-rider card, distance-to-dropoff) - the ride-sharing equivalent,
 * scoped down since RideRequest has no package type or receiver fields.
 */
export default function TrackRide() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { id } = router.query;

  const { data: ride, isLoading, isError } = useQuery(
    ["rideshare-ride", id],
    () => fetchRide(id),
    { enabled: Boolean(id) && isAuthenticated, refetchInterval: POLL_MS }
  );

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("rideSharing.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isError || (!isLoading && !ride)) {
    return (
      <Box>
        <TopBar title={t("rideSharing.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("rideSharing.tracking.notFound")}</Typography>
        </Box>
      </Box>
    );
  }

  if (isLoading || !ride) {
    return (
      <Box>
        <TopBar title={t("rideSharing.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  const pickup = ride.pickupLat != null ? { lat: ride.pickupLat, lng: ride.pickupLng } : null;
  const dropoff = ride.dropoffLat != null ? { lat: ride.dropoffLat, lng: ride.dropoffLng } : null;
  const rider = ride.riderLat != null ? { lat: ride.riderLat, lng: ride.riderLng } : null;

  const distanceToDropoffKm =
    rider && dropoff ? haversineDistanceKm(rider.lat, rider.lng, dropoff.lat, dropoff.lng) : null;

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("rideSharing.tracking.title")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2 }}>
        <StatusTrack status={ride.status} t={t} />

        <LiveTrackingMap pickup={pickup} dropoff={dropoff} agent={rider} height={260} />

        <Box sx={{ mt: 2, mb: 2 }}>
          {!ride.assignedRider && ride.status === "REQUESTED" && (
            <Chip label={t("rideSharing.tracking.waitingForRider")} sx={{ fontWeight: 700 }} />
          )}
          {ride.assignedRider && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #EEEEEE",
                borderRadius: 3,
                p: 1.5,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t("rideSharing.tracking.riderAssigned", {
                    name: ride.assignedRider.name || ride.assignedRider.phone,
                  })}
                </Typography>
                {distanceToDropoffKm != null && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t("rideSharing.tracking.distanceAway", { km: distanceToDropoffKm.toFixed(1) })}
                  </Typography>
                )}
              </Box>
              {ride.assignedRider.phone && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhoneRoundedIcon fontSize="small" />}
                  href={`tel:${ride.assignedRider.phone}`}
                  sx={{ fontWeight: 700 }}
                >
                  {t("rideSharing.tracking.callRider")}
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("rideSharing.pickupLocation")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
              {ride.pickupAddress}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("rideSharing.dropoffLocation")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
              {ride.dropoffAddress}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t(`rideSharing.vehicles.${ride.vehicleType}`, { defaultValue: ride.vehicleType })}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {formatCfa(ride.priceEstimate)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
