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
import { fetchPosting } from "../../../src/api/anando";
import { haversineDistanceKm } from "../../../src/utils/geo";
import { formatCfa } from "../../../src/utils/currency";

const POLL_MS = 5000;

/**
 * Booked passenger's tracking page for one Anando posting, mirroring
 * pages/delivery/track/[id].js's structure (live map, driver card,
 * distance-to-destination). Unlike delivery/ride-sharing, the driver is
 * known from the moment a seat is booked, so there's no "waiting for a
 * match" state - only "waiting for the driver to depart".
 */
export default function TrackAnando() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { id } = router.query;

  const { data: posting, isLoading, isError } = useQuery(
    ["anando-posting", id],
    () => fetchPosting(id),
    { enabled: Boolean(id) && isAuthenticated, refetchInterval: POLL_MS }
  );

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("anando.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isError || (!isLoading && !posting)) {
    return (
      <Box>
        <TopBar title={t("anando.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("anando.tracking.notFound")}</Typography>
        </Box>
      </Box>
    );
  }

  if (isLoading || !posting) {
    return (
      <Box>
        <TopBar title={t("anando.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  const origin = posting.originLat != null ? { lat: posting.originLat, lng: posting.originLng } : null;
  const destination =
    posting.destinationLat != null ? { lat: posting.destinationLat, lng: posting.destinationLng } : null;
  const driver = posting.driverLat != null ? { lat: posting.driverLat, lng: posting.driverLng } : null;

  const distanceToDestinationKm =
    driver && destination
      ? haversineDistanceKm(driver.lat, driver.lng, destination.lat, destination.lng)
      : null;

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("anando.tracking.title")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Chip label={t(`anando.status.${posting.status}`)} sx={{ fontWeight: 700 }} />
        </Box>

        <LiveTrackingMap pickup={origin} dropoff={destination} agent={driver} height={260} />

        <Box sx={{ mt: 2, mb: 2 }}>
          {posting.status !== "DEPARTED" ? (
            <Chip label={t("anando.tracking.waitingForDeparture")} sx={{ fontWeight: 700 }} />
          ) : (
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
                  {t("anando.tracking.driverEnRoute", {
                    name: posting.driver?.name || posting.driver?.phone,
                  })}
                </Typography>
                {distanceToDestinationKm != null && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t("anando.tracking.distanceAway", { km: distanceToDestinationKm.toFixed(1) })}
                  </Typography>
                )}
              </Box>
              {posting.driver?.phone && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhoneRoundedIcon fontSize="small" />}
                  href={`tel:${posting.driver.phone}`}
                  sx={{ fontWeight: 700 }}
                >
                  {t("anando.tracking.callDriver")}
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("anando.origin")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
              {posting.originAddress}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("anando.destination")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
              {posting.destinationAddress}
            </Typography>
          </Box>
          {posting.pricePerSeat && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("anando.pricePerSeatOptional")}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatCfa(posting.pricePerSeat)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
