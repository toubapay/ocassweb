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
import DeliveryDistancePriceCard from "../../../src/components/delivery/DeliveryDistancePriceCard";
import { packageTypeIconComponent, packageTypeColors } from "../../../src/constants/deliveryPackageTypeOptions";
import useAuth from "../../../src/hooks/useAuth";
import { fetchDeliveryRequest, fetchDeliveryPackageTypes } from "../../../src/api/modules";
import { haversineDistanceKm } from "../../../src/utils/geo";

const STEPS = ["REQUESTED", "ACCEPTED", "PICKED_UP", "DELIVERED"];
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
        {t(`delivery.status.${status}`, { defaultValue: status })}
      </Typography>
    </Box>
  );
}

export default function TrackDelivery() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { id } = router.query;
  const isFrench = i18n.language?.startsWith("fr");

  const { data: request, isLoading, isError } = useQuery(
    ["delivery-request", id],
    () => fetchDeliveryRequest(id),
    { enabled: Boolean(id) && isAuthenticated, refetchInterval: POLL_MS }
  );
  // Includes deactivated types too, so a request whose type was later
  // retired by an admin still shows a real label/icon here (see
  // GET /delivery/package-types).
  const { data: packageTypes } = useQuery("delivery-package-types", fetchDeliveryPackageTypes);

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("delivery.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isError || (!isLoading && !request)) {
    return (
      <Box>
        <TopBar title={t("delivery.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("delivery.tracking.notFound")}</Typography>
        </Box>
      </Box>
    );
  }

  if (isLoading || !request) {
    return (
      <Box>
        <TopBar title={t("delivery.tracking.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  const pickup = request.pickupLat != null ? { lat: request.pickupLat, lng: request.pickupLng } : null;
  const dropoff = request.dropoffLat != null ? { lat: request.dropoffLat, lng: request.dropoffLng } : null;
  const agent = request.agentLat != null ? { lat: request.agentLat, lng: request.agentLng } : null;

  const distanceToDropoffKm =
    agent && dropoff ? haversineDistanceKm(agent.lat, agent.lng, dropoff.lat, dropoff.lng) : null;
  const packageType = (packageTypes || []).find((pt) => pt.key === request.packageType);

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("delivery.tracking.title")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2 }}>
        <StatusTrack status={request.status} t={t} />

        {packageType &&
          (() => {
            const Icon = packageTypeIconComponent(packageType.icon);
            const { color } = packageTypeColors(packageType.colorKey);
            return (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  mb: 1.5,
                  borderRadius: 5,
                  border: "1px dashed #CCCCCC",
                }}
              >
                <Icon fontSize="small" sx={{ color }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {isFrench ? packageType.labelFr : packageType.labelEn}
                </Typography>
              </Box>
            );
          })()}

        <LiveTrackingMap pickup={pickup} dropoff={dropoff} agent={agent} height={260} />

        <Box sx={{ mt: 2, mb: 2 }}>
          {!request.assignedAgent && request.status === "REQUESTED" && (
            <Chip label={t("delivery.tracking.waitingForAgent")} sx={{ fontWeight: 700 }} />
          )}
          {request.assignedAgent && (
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
                  {t("delivery.tracking.agentAssigned", { name: request.assignedAgent.name || request.assignedAgent.phone })}
                </Typography>
                {distanceToDropoffKm != null && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t("delivery.tracking.distanceAway", { km: distanceToDropoffKm.toFixed(1) })}
                  </Typography>
                )}
              </Box>
              {request.assignedAgent.phone && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhoneRoundedIcon fontSize="small" />}
                  href={`tel:${request.assignedAgent.phone}`}
                  sx={{ fontWeight: 700 }}
                >
                  {t("delivery.tracking.callAgent")}
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("delivery.pickupAddress")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
              {request.pickupAddress}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("delivery.dropoffAddress")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
              {request.dropoffAddress}
            </Typography>
          </Box>
          {request.receiverName && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("delivery.tracking.receiver")}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {request.receiverName} · {request.receiverPhone}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <DeliveryDistancePriceCard distanceKm={request.distanceKm} priceEstimate={request.priceEstimate} />
        </Box>
      </Box>
    </Box>
  );
}
