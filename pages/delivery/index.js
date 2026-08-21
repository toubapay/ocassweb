import { useEffect, useState } from "react";
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
import Divider from "@mui/material/Divider";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import TopBar from "../../src/components/layout/TopBar";
import AddressAutocompleteField from "../../src/components/maps/AddressAutocompleteField";
import LiveTrackingMap from "../../src/components/maps/LiveTrackingMap";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchDeliveryRequests,
  createDeliveryRequest,
  cancelDeliveryRequest,
  fetchDeliveryFeeQuote,
} from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

export default function Delivery() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [packageNote, setPackageNote] = useState("");

  // Prefill sender contact from the logged-in account - editable, since
  // the requester may be sending on someone else's behalf.
  useEffect(() => {
    if (user && !senderName && !senderPhone) {
      setSenderName(user.name || "");
      setSenderPhone(user.phone || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { data: requests } = useQuery("delivery-requests", fetchDeliveryRequests, {
    enabled: isAuthenticated,
  });

  const { data: feeQuote } = useQuery(
    ["delivery-fee-quote", pickupCoords, dropoffCoords],
    () =>
      fetchDeliveryFeeQuote({
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
      }),
    { enabled: Boolean(pickupCoords && dropoffCoords) }
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("delivery.locationError"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success(t("delivery.locationSet"));
      },
      () => toast.error(t("delivery.locationError"))
    );
  };

  const mutation = useMutation(
    () =>
      createDeliveryRequest({
        senderName: senderName || undefined,
        senderPhone: senderPhone || undefined,
        pickupAddress,
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        receiverName,
        receiverPhone,
        dropoffAddress,
        dropoffLat: dropoffCoords?.lat,
        dropoffLng: dropoffCoords?.lng,
        packageNote,
      }),
    {
      onSuccess: (request) => {
        toast.success(t("delivery.requestCreated", { amount: formatCfa(request.priceEstimate) }));
        queryClient.invalidateQueries("delivery-requests");
        setPickupAddress("");
        setPickupCoords(null);
        setReceiverName("");
        setReceiverPhone("");
        setDropoffAddress("");
        setDropoffCoords(null);
        setPackageNote("");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("delivery.couldNotCreate")),
    }
  );

  const cancelMutation = useMutation((id) => cancelDeliveryRequest(id), {
    onSuccess: () => {
      toast.success(t("delivery.requestCancelled"));
      queryClient.invalidateQueries("delivery-requests");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("delivery.couldNotCancel")),
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast(t("delivery.loginToRequest"));
      router.push("/auth/login");
      return;
    }
    if (!pickupAddress || !dropoffAddress) {
      toast.error(t("delivery.enterAddresses"));
      return;
    }
    if (!receiverName.trim() || !receiverPhone.trim()) {
      toast.error(t("delivery.enterReceiver"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("delivery.title")} showBack={false} showSearch={false} showCart={false} />

      <Box sx={{ p: 2.5, background: "linear-gradient(180deg, #FFF6E5 0%, #FFFFFF 100%)" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          {t("delivery.heading")}
        </Typography>

        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
          {t("delivery.senderSectionTitle")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 1, mb: 1.5 }}>
          <TextField
            label={t("delivery.senderName")}
            fullWidth
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            sx={{ bgcolor: "background.paper" }}
          />
          <TextField
            label={t("delivery.senderPhone")}
            fullWidth
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            sx={{ bgcolor: "background.paper" }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2.5 }}>
          <AddressAutocompleteField
            label={t("delivery.pickupAddress")}
            fullWidth
            value={pickupAddress}
            onTextChange={(v) => {
              setPickupAddress(v);
              setPickupCoords(null);
            }}
            onPlaceSelected={({ address, lat, lng }) => {
              setPickupAddress(address);
              setPickupCoords({ lat, lng });
            }}
            sx={{ bgcolor: "background.paper" }}
          />
          <IconButton
            onClick={useMyLocation}
            title={t("delivery.useMyLocation")}
            sx={{
              bgcolor: pickupCoords ? "primary.main" : "primary.light",
              color: pickupCoords ? "#fff" : "primary.main",
            }}
          >
            <MyLocationRoundedIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
          {t("delivery.receiverSectionTitle")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 1, mb: 1.5 }}>
          <TextField
            label={t("delivery.receiverName")}
            fullWidth
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            sx={{ bgcolor: "background.paper" }}
          />
          <TextField
            label={t("delivery.receiverPhone")}
            fullWidth
            value={receiverPhone}
            onChange={(e) => setReceiverPhone(e.target.value)}
            sx={{ bgcolor: "background.paper" }}
          />
        </Box>
        <AddressAutocompleteField
          label={t("delivery.dropoffAddress")}
          fullWidth
          value={dropoffAddress}
          onTextChange={(v) => {
            setDropoffAddress(v);
            setDropoffCoords(null);
          }}
          onPlaceSelected={({ address, lat, lng }) => {
            setDropoffAddress(address);
            setDropoffCoords({ lat, lng });
          }}
          sx={{ mb: 2, bgcolor: "background.paper" }}
        />

        {pickupCoords && dropoffCoords && (
          <Box sx={{ mb: 2 }}>
            <LiveTrackingMap pickup={pickupCoords} dropoff={dropoffCoords} height={200} />
            {feeQuote && (
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, textAlign: "center" }}>
                {t("delivery.distanceAndPrice", {
                  km: feeQuote.distanceKm.toFixed(1),
                  amount: formatCfa(feeQuote.priceEstimate),
                })}
              </Typography>
            )}
          </Box>
        )}

        <TextField
          label={t("delivery.packageNote")}
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
          {mutation.isLoading ? t("delivery.requesting") : t("delivery.getEstimate")}
        </Button>
      </Box>

      {isAuthenticated && (requests || []).length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            {t("delivery.yourRequests")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {requests.map((r) => (
              <Box key={r.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {r.pickupAddress} → {r.dropoffAddress}
                  </Typography>
                  <Chip label={t(`delivery.status.${r.status}`, { defaultValue: r.status })} size="small" />
                </Box>
                {r.receiverName && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                    {t("delivery.tracking.receiver")}: {r.receiverName} · {r.receiverPhone}
                  </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {r.distanceKm != null
                      ? t("delivery.estimateWithDistance", {
                          km: r.distanceKm.toFixed(1),
                          amount: formatCfa(r.priceEstimate),
                        })
                      : t("delivery.estimate", { amount: formatCfa(r.priceEstimate) })}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => router.push(`/delivery/track/${r.id}`)}
                      sx={{ fontWeight: 700, minWidth: 0, py: 0.25 }}
                    >
                      {t("delivery.track")}
                    </Button>
                    {r.status === "REQUESTED" && (
                      <Button
                        size="small"
                        color="error"
                        disabled={cancelMutation.isLoading}
                        onClick={() => cancelMutation.mutate(r.id)}
                        sx={{ fontWeight: 700, minWidth: 0, p: 0 }}
                      >
                        {t("delivery.cancel")}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
