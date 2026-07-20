import { useState } from "react";
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
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchAvailableRideJobs,
  fetchMyRideJobs,
  acceptRideJob,
  startRideJob,
  completeRideJob,
} from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

export default function RideDriverDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const isRider = isAuthenticated && user?.role === "RIDER";

  const { data: available, isLoading: loadingAvailable } = useQuery(
    "ride-jobs-available",
    fetchAvailableRideJobs,
    { enabled: isRider, refetchInterval: 15000 }
  );
  const { data: myJobs, isLoading: loadingMine } = useQuery(
    "ride-jobs-mine",
    fetchMyRideJobs,
    { enabled: isRider }
  );

  const invalidateJobs = () => {
    queryClient.invalidateQueries("ride-jobs-available");
    queryClient.invalidateQueries("ride-jobs-mine");
  };

  const acceptMutation = useMutation((id) => acceptRideJob(id), {
    onSuccess: () => {
      toast.success(t("rideSharing.driver.accepted"));
      invalidateJobs();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("rideSharing.driver.alreadyTaken")),
  });

  const startMutation = useMutation((id) => startRideJob(id), {
    onSuccess: () => {
      toast.success(t("rideSharing.driver.startedToast"));
      invalidateJobs();
    },
  });

  const completeMutation = useMutation((id) => completeRideJob(id), {
    onSuccess: () => {
      toast.success(t("rideSharing.driver.completedToast"));
      invalidateJobs();
      queryClient.invalidateQueries("wallet");
      queryClient.invalidateQueries("wallet-transactions");
    },
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("rideSharing.driver.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (!isRider) {
    return (
      <Box>
        <TopBar title={t("rideSharing.driver.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("profile.becomeRider")}</Typography>
          <Button variant="contained" onClick={() => router.push("/profile")}>
            {t("nav.profile")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("rideSharing.driver.title")} showCart={false} showSearch={false} />

      <Box sx={{ px: 1 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ "& .MuiTab-root": { fontWeight: 700, textTransform: "none" } }}
        >
          <Tab label={t("rideSharing.driver.availableTab")} />
          <Tab label={t("rideSharing.driver.myJobsTab")} />
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
              {t("rideSharing.driver.noAvailable")}
            </Typography>
          )}
          {(available || []).map((ride) => (
            <Box key={ride.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {ride.pickupAddress} → {ride.dropoffAddress}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t(`rideSharing.vehicles.${ride.vehicleType}`, { defaultValue: ride.vehicleType })} ·{" "}
                  {formatCfa(ride.priceEstimate)}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  disabled={acceptMutation.isLoading}
                  onClick={() => acceptMutation.mutate(ride.id)}
                  sx={{ fontWeight: 700 }}
                >
                  {t("rideSharing.driver.accept")}
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
              {t("rideSharing.driver.noMyJobs")}
            </Typography>
          )}
          {(myJobs || []).map((ride) => (
            <Box key={ride.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {ride.pickupAddress} → {ride.dropoffAddress}
                </Typography>
                <Chip label={t(`rideSharing.status.${ride.status}`, { defaultValue: ride.status })} size="small" />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t(`rideSharing.vehicles.${ride.vehicleType}`, { defaultValue: ride.vehicleType })} ·{" "}
                  {formatCfa(ride.priceEstimate)}
                </Typography>
                {ride.status === "ACCEPTED" && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={startMutation.isLoading}
                    onClick={() => startMutation.mutate(ride.id)}
                    sx={{ fontWeight: 700 }}
                  >
                    {t("rideSharing.driver.start")}
                  </Button>
                )}
                {ride.status === "IN_PROGRESS" && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={completeMutation.isLoading}
                    onClick={() => completeMutation.mutate(ride.id)}
                    sx={{ fontWeight: 700 }}
                  >
                    {t("rideSharing.driver.complete")}
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
