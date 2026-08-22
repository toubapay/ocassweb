import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import { formatCfa } from "../../utils/currency";

// Two-column distance/price summary, used both as a live preview on the
// request form (once pickup and dropoff have coordinates) and as a
// read-only row on the tracking/detail page - same data, two call sites,
// kept as one component so they can't drift apart visually.
export default function DeliveryDistancePriceCard({ distanceKm, priceEstimate }) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        border: "1px solid #EEEEEE",
        borderRadius: 3,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1, p: 1.5 }}>
        <PlaceRoundedIcon sx={{ color: "#E5484D" }} />
        <Box>
          <Typography sx={{ fontWeight: 800 }}>
            {distanceKm != null ? t("delivery.distanceKm", { km: distanceKm.toFixed(2) }) : "—"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("delivery.distanceLabel")}
          </Typography>
        </Box>
      </Box>
      <Divider orientation="vertical" flexItem />
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1, p: 1.5 }}>
        <TwoWheelerRoundedIcon sx={{ color: "primary.main" }} />
        <Box>
          <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{formatCfa(priceEstimate)}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("delivery.priceEstimateLabel")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
