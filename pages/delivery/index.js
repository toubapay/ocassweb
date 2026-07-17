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
import { fetchDeliveryRequests, createDeliveryRequest } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

export default function Delivery() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [packageNote, setPackageNote] = useState("");

  const { data: requests } = useQuery("delivery-requests", fetchDeliveryRequests, {
    enabled: isAuthenticated,
  });

  const mutation = useMutation(
    () => createDeliveryRequest({ pickupAddress, dropoffAddress, packageNote }),
    {
      onSuccess: (request) => {
        toast.success(`Request created · estimate ${formatCfa(request.priceEstimate)}`);
        queryClient.invalidateQueries("delivery-requests");
        setPickupAddress("");
        setDropoffAddress("");
        setPackageNote("");
      },
      onError: () => toast.error("Could not create request"),
    }
  );

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast("Log in to request a delivery");
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
      <TopBar title="Package Delivery" showBack={false} showSearch={false} showCart={false} />

      <Box sx={{ p: 2.5, background: "linear-gradient(180deg, #FFF6E5 0%, #FFFFFF 100%)" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Send a package across town
        </Typography>
        <TextField
          label="Pickup address"
          fullWidth
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />
        <TextField
          label="Dropoff address"
          fullWidth
          value={dropoffAddress}
          onChange={(e) => setDropoffAddress(e.target.value)}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />
        <TextField
          label="What are you sending? (optional)"
          fullWidth
          value={packageNote}
          onChange={(e) => setPackageNote(e.target.value)}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={mutation.isLoading}
          onClick={handleSubmit}
          sx={{ fontWeight: 800, py: 1.25, bgcolor: "#FFB020", "&:hover": { bgcolor: "#E89D14" } }}
        >
          {mutation.isLoading ? "Requesting..." : "Get a price estimate"}
        </Button>
      </Box>

      {isAuthenticated && (requests || []).length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Your requests
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {requests.map((r) => (
              <Box key={r.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {r.pickupAddress} → {r.dropoffAddress}
                  </Typography>
                  <Chip label={r.status} size="small" />
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Estimate: {formatCfa(r.priceEstimate)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
