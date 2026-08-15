import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import GpsFixedRoundedIcon from "@mui/icons-material/GpsFixedRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchAvailableDeliveryJobs,
  fetchMyDeliveryJobs,
  acceptDeliveryJob,
  markDeliveryPickedUp,
  markDeliveryDelivered,
  updateDeliveryAgentLocation,
} from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

const ACTIVE_STATUSES = ["ACCEPTED", "PICKED_UP"];
const LOCATION_PING_MS = 10000;

/**
 * Reports this agent's current position for every job they're actively
 * working (ACCEPTED/PICKED_UP), on an interval - powers the customer's
 * live tracking map (see LiveTrackingMap.js). A single getCurrentPosition
 * call per tick (not watchPosition) keeps this predictable and easy to
 * throttle, at the cost of only updating on the interval rather than the
 * instant the device moves; fine for a courier walking/riding across a
 * city, not fine for anything needing sub-10-second precision.
 */
function useLiveLocationBroadcast(activeJobIds) {
  const [sharing, setSharing] = useState(false);
  const idsRef = useRef(activeJobIds);
  idsRef.current = activeJobIds;

  useEffect(() => {
    if (activeJobIds.length === 0 || !navigator.geolocation) {
      setSharing(false);
      return undefined;
    }
    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSharing(true);
          const { latitude: lat, longitude: lng } = pos.coords;
          idsRef.current.forEach((id) => {
            updateDeliveryAgentLocation(id, { lat, lng }).catch(() => {});
          });
        },
        () => setSharing(false)
      );
    };
    ping();
    const interval = setInterval(ping, LOCATION_PING_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobIds.join(",")]);

  return sharing;
}

export default function DeliveryAgentDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const isAgent = isAuthenticated && user?.role === "DELIVERY_AGENT";

  const { data: available, isLoading: loadingAvailable } = useQuery(
    "delivery-jobs-available",
    fetchAvailableDeliveryJobs,
    { enabled: isAgent, refetchInterval: 15000 }
  );
  const { data: myJobs, isLoading: loadingMine } = useQuery(
    "delivery-jobs-mine",
    fetchMyDeliveryJobs,
    { enabled: isAgent, refetchInterval: LOCATION_PING_MS }
  );

  const activeJobIds = (myJobs || []).filter((j) => ACTIVE_STATUSES.includes(j.status)).map((j) => j.id);
  const sharingLocation = useLiveLocationBroadcast(activeJobIds);

  const invalidateJobs = () => {
    queryClient.invalidateQueries("delivery-jobs-available");
    queryClient.invalidateQueries("delivery-jobs-mine");
  };

  const acceptMutation = useMutation((id) => acceptDeliveryJob(id), {
    onSuccess: () => {
      toast.success(t("delivery.agent.accepted"));
      invalidateJobs();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("delivery.agent.alreadyTaken")),
  });

  const pickedUpMutation = useMutation((id) => markDeliveryPickedUp(id), {
    onSuccess: () => {
      toast.success(t("delivery.agent.pickedUpToast"));
      invalidateJobs();
    },
  });

  const deliveredMutation = useMutation((id) => markDeliveryDelivered(id), {
    onSuccess: () => {
      toast.success(t("delivery.agent.deliveredToast"));
      invalidateJobs();
      queryClient.invalidateQueries("wallet");
      queryClient.invalidateQueries("wallet-transactions");
    },
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("delivery.agent.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (!isAgent) {
    return (
      <Box>
        <TopBar title={t("delivery.agent.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("profile.becomeAgent")}</Typography>
          <Button variant="contained" onClick={() => router.push("/profile")}>
            {t("nav.profile")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("delivery.agent.title")} showCart={false} showSearch={false} />

      {sharingLocation && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 2, pt: 1.5 }}>
          <GpsFixedRoundedIcon sx={{ fontSize: 16, color: "primary.main" }} />
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
            {t("delivery.agent.sharingLocation")}
          </Typography>
        </Box>
      )}

      <Box sx={{ px: 1 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ "& .MuiTab-root": { fontWeight: 700, textTransform: "none" } }}
        >
          <Tab label={t("delivery.agent.availableTab")} />
          <Tab label={t("delivery.agent.myJobsTab")} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loadingAvailable && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.loading")}
            </Typography>
          )}
          {!loadingAvailable && (available || []).length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("delivery.agent.noAvailable")}
            </Typography>
          )}
          {(available || []).map((job) => (
            <Box key={job.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {job.pickupAddress} → {job.dropoffAddress}
              </Typography>
              {(job.senderName || job.receiverName) && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                  {job.senderName && `${t("delivery.agent.sender")}: ${job.senderName}`}
                  {job.senderName && job.receiverName && " · "}
                  {job.receiverName && `${t("delivery.agent.receiver")}: ${job.receiverName}`}
                </Typography>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("delivery.estimate", { amount: formatCfa(job.priceEstimate) })}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  disabled={acceptMutation.isLoading}
                  onClick={() => acceptMutation.mutate(job.id)}
                  sx={{ fontWeight: 700 }}
                >
                  {t("delivery.agent.accept")}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loadingMine && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.loading")}
            </Typography>
          )}
          {!loadingMine && (myJobs || []).length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("delivery.agent.noMyJobs")}
            </Typography>
          )}
          {(myJobs || []).map((job) => (
            <Box key={job.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {job.pickupAddress} → {job.dropoffAddress}
                </Typography>
                <Chip label={t(`delivery.status.${job.status}`, { defaultValue: job.status })} size="small" />
              </Box>
              {job.senderName && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                  {t("delivery.agent.sender")}: {job.senderName} · {job.senderPhone}
                </Typography>
              )}
              {job.receiverName && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  {t("delivery.agent.receiver")}: {job.receiverName} · {job.receiverPhone}
                </Typography>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("delivery.estimate", { amount: formatCfa(job.priceEstimate) })}
                </Typography>
                {job.status === "ACCEPTED" && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={pickedUpMutation.isLoading}
                    onClick={() => pickedUpMutation.mutate(job.id)}
                    sx={{ fontWeight: 700 }}
                  >
                    {t("delivery.agent.markPickedUp")}
                  </Button>
                )}
                {job.status === "PICKED_UP" && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={deliveredMutation.isLoading}
                    onClick={() => deliveredMutation.mutate(job.id)}
                    sx={{ fontWeight: 700 }}
                  >
                    {t("delivery.agent.markDelivered")}
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
