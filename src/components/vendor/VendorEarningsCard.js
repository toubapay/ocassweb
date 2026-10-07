import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { fetchMyVendorEarnings } from "../../api/vendor";
import { formatCfa } from "../../utils/currency";

/**
 * What the shop sold, what the platform kept, and what reached the
 * vendor's wallet.
 *
 * All three come from the backend, which reads the paid-out figure back
 * from the VENDOR_SALE wallet transactions rather than recomputing it -
 * so this card cannot tell a vendor a different number from the one in
 * their wallet, which a second client-side calculation eventually would.
 *
 * The commission is shown as its own line rather than left as the gap
 * between two numbers: a marketplace that takes a cut should say so on
 * the screen where the vendor looks at their money, and the rate is
 * labelled with where it comes from, because an admin can set one for
 * this shop alone.
 */
export default function VendorEarningsCard({ enabled }) {
  const { t } = useTranslation();
  const { data } = useQuery("vendor-earnings", fetchMyVendorEarnings, { enabled });

  if (!data) return null;

  const rows = [
    { label: t("vendor.earnings.gross"), value: data.grossFcfa, strong: false },
    // Negated only when there is something to subtract: `-0 < 0` is false
    // in JavaScript, so a shop with no sales had the minus sign come out
    // of toLocaleString instead and read "CFA -0".
    {
      label: t("vendor.earnings.commission"),
      value: data.commissionFcfa > 0 ? -data.commissionFcfa : 0,
      muted: true,
    },
    { label: t("vendor.earnings.net"), value: data.earnedFcfa, strong: true },
  ];

  return (
    <Box
      sx={{
        borderRadius: 4,
        p: 2,
        mb: 2,
        bgcolor: "#E7F7EE",
        border: "1px solid #CFEFDD",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t("vendor.earnings.title")}
        </Typography>
        <Tooltip
          title={
            data.sharePercentSource === "store"
              ? t("vendor.earnings.rateForShop", { percent: data.sharePercent })
              : t("vendor.earnings.ratePlatform", { percent: data.sharePercent })
          }
        >
          <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
        </Tooltip>
      </Box>

      {rows.map((row) => (
        <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
          <Typography
            variant="body2"
            sx={{ color: row.muted ? "text.secondary" : "text.primary", fontWeight: row.strong ? 800 : 500 }}
          >
            {row.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: row.strong ? 800 : 600 }}>
            {row.value < 0 ? `- ${formatCfa(Math.abs(row.value))}` : formatCfa(row.value)}
          </Typography>
        </Box>
      ))}

      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
        {data.payoutCount > 0
          ? t("vendor.earnings.payouts", { count: data.payoutCount })
          : t("vendor.earnings.noSalesYet")}
      </Typography>
    </Box>
  );
}
