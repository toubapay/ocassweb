import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyRides, createRideRequest, cancelRide } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

const VEHICLES = ["MOTO", "ECONOMY", "COMFORT"];

export default function RideSharing() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("ECONOMY");

  const { data: rides } = useQuery("my-rides", fetchMyRides, { enabled: isAuthenticated });

  // There's no geocoding/maps integration in this app (no API key
  // configured), so a typed address never has coordinates on its own -
  // this is the one way to get a real pickup point for distance-based
  // pricing. Dropoff stays address-text-only until a map picker exists.
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("rideSharing.locationError"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success(t("rideSharing.locationSet"));
      },
      () => toast.error(t("rideSharing.locationError"))
    );
  };

  const mutation = useMutation(
    () =>
      createRideRequest({
        pickupAddress,
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        dropoffAddress,
        vehicleType,
      }),
    {
      onSuccess: (ride) => {
        toast.success(t("rideSharing.rideRequested", { amount: formatCfa(ride.priceEstimate) }));
        queryClient.invalidateQueries("my-rides");
        setPickupAddress("");
        setPickupCoords(null);
        setDropoffAddress("");
      },
      onError: () => toast.error(t("rideSharing.couldNotRequest")),
    }
  );

  const cancelMutation = useMutation((id) => cancelRide(id), {
    onSuccess: () => {
      toast.success(t("rideSharing.rideCancelled"));
      queryClient.invalidateQueries("my-rides");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("rideSharing.couldNotCancel")),
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast(t("rideSharing.loginToBook"));
      router.push("/auth/login");
      return;
    }
    if (!pickupAddress || !dropoffAddress) {
      toast.error(t("rideSharing.enterAddresses"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("rideSharing.title")} showBack={false} showSearch={false} showCart={false} />

      <Box sx={{ p: 2.5, background: "linear-gradient(180deg, #EAF2FE 0%, #FFFFFF 100%)" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          {t("rideSharing.heading")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <TextField
            label={t("rideSharing.pickupLocation")}
            fullWidth
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            sx={{ bgcolor: "background.paper" }}
          />
          <IconButton
            onClick={useMyLocation}
            title={t("rideSharing.useMyLocation")}
            sx={{
              bgcolor: pickupCoords ? "primary.main" : "primary.light",
              color: pickupCoords ? "#fff" : "primary.main",
            }}
          >
            <MyLocationRoundedIcon />
          </IconButton>
        </Box>
        <TextField
          label={t("rideSharing.dropoffLocation")}
          fullWidth
          value={dropoffAddress}
          onChange={(e) => setDropoffAddress(e.target.value)}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />

        <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
          {VEHICLES.map((v) => (
            <Chip
              key={v}
              label={t(`rideSharing.vehicles.${v}`)}
              onClick={() => setVehicleType(v)}
              color={vehicleType === v ? "primary" : "default"}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={mutation.isLoading}
          onClick={handleSubmit}
          sx={{ fontWeight: 800, py: 1.25, bgcolor: "#3B82F6", "&:hover": { bgcolor: "#2f6fd6" } }}
        >
          {mutation.isLoading ? t("rideSharing.requesting") : t("rideSharing.requestRide")}
        </Button>
      </Box>

      {isAuthenticated && (rides || []).length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            {t("rideSharing.yourRides")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {rides.map((r) => (
              <Box key={r.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {r.pickupAddress} → {r.dropoffAddress}
                  </Typography>
                  <Chip label={t(`rideSharing.status.${r.status}`, { defaultValue: r.status })} size="small" />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t(`rideSharing.vehicles.${r.vehicleType}`, { defaultValue: r.vehicleType })} · {formatCfa(r.priceEstimate)}
                  </Typography>
                  {r.status === "REQUESTED" && (
                    <Button
                      size="small"
                      color="error"
                      disabled={cancelMutation.isLoading}
                      onClick={() => cancelMutation.mutate(r.id)}
                      sx={{ fontWeight: 700, minWidth: 0, p: 0 }}
                    >
                      {t("rideSharing.cancel")}
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
