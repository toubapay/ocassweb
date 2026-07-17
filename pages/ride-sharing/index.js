import { useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyRides, createRideRequest } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

const VEHICLES = [
  { value: "MOTO", label: "Moto" },
  { value: "ECONOMY", label: "Economy" },
  { value: "COMFORT", label: "Comfort" },
];

export default function RideSharing() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("ECONOMY");

  const { data: rides } = useQuery("my-rides", fetchMyRides, { enabled: isAuthenticated });

  const mutation = useMutation(
    () => createRideRequest({ pickupAddress, dropoffAddress, vehicleType }),
    {
      onSuccess: (ride) => {
        toast.success(`Ride requested · estimate ${formatCfa(ride.priceEstimate)}`);
        queryClient.invalidateQueries("my-rides");
        setPickupAddress("");
        setDropoffAddress("");
      },
      onError: () => toast.error("Could not request ride"),
    }
  );

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast("Log in to book a ride");
      router.push("/auth/login");
      return;
    }
    if (!pickupAddress || !dropoffAddress) {
      toast.error("Enter pickup and dropoff addresses");
      return;
    }
    mutation.mutate();
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title="Ride Sharing" showBack={false} showSearch={false} showCart={false} />

      <Box sx={{ p: 2.5, background: "linear-gradient(180deg, #EAF2FE 0%, #FFFFFF 100%)" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Where are you headed?
        </Typography>
        <TextField
          label="Pickup location"
          fullWidth
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />
        <TextField
          label="Dropoff location"
          fullWidth
          value={dropoffAddress}
          onChange={(e) => setDropoffAddress(e.target.value)}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />

        <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
          {VEHICLES.map((v) => (
            <Chip
              key={v.value}
              label={v.label}
              onClick={() => setVehicleType(v.value)}
              color={vehicleType === v.value ? "primary" : "default"}
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
          {mutation.isLoading ? "Requesting..." : "Request ride"}
        </Button>
      </Box>

      {isAuthenticated && (rides || []).length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Your rides
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {rides.map((r) => (
              <Box key={r.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {r.pickupAddress} → {r.dropoffAddress}
                  </Typography>
                  <Chip label={r.status} size="small" />
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {r.vehicleType} · {formatCfa(r.priceEstimate)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
