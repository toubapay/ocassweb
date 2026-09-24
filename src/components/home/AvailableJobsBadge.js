import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import useAuth from "../../hooks/useAuth";
import useJobAlertSound from "../../hooks/useJobAlertSound";
import { useLiveStatus } from "../live/LiveUpdatesProvider";
import { fetchAvailableDeliveryJobCount, fetchAvailableRideJobCount } from "../../api/modules";

// Matches the job boards' own refetchInterval (pages/delivery/agent.js,
// pages/ride-sharing/driver.js), so an agent watching the home screen and
// an agent watching the board learn about a new job at the same cadence -
// and when the live stream is connected, neither of them waits for it: a
// job posted anywhere reaches this badge in milliseconds (see
// LiveUpdatesProvider.js). The poll stays on as the backstop, slower.
const POLL_MS = 15000;
const LIVE_POLL_MS = 120000;

/**
 * Per gig-work role: which count to poll, where "accept it" goes, and what
 * to call the thing. `role` is User.role, a single value (see
 * schema.prisma) - a user is a DELIVERY_AGENT or a RIDER, not both - so
 * this is a lookup rather than a merge of two counts.
 */
const ROLES = {
  DELIVERY_AGENT: {
    fetchCount: fetchAvailableDeliveryJobCount,
    queryKey: "delivery-jobs-available-count",
    href: "/delivery/agent",
    icon: TwoWheelerRoundedIcon,
    titleKey: "home.jobsBadge.deliveryTitle",
  },
  RIDER: {
    fetchCount: fetchAvailableRideJobCount,
    queryKey: "ride-jobs-available-count",
    href: "/ride-sharing/driver",
    icon: DirectionsCarFilledRoundedIcon,
    titleKey: "home.jobsBadge.rideTitle",
  },
};

/**
 * "There is work waiting" for a delivery agent / rider, on the home screen
 * where they already are.
 *
 * Renders nothing at all unless the signed-in user holds a gig-work role
 * AND there is at least one job they could actually accept: a badge
 * reading "0 available" is noise on every customer's home screen, and the
 * whole point of it is to be an interruption. The count comes from
 * /jobs/available/count, which excludes the agent's own requests - accept
 * refuses those, so counting them would promise work that isn't there.
 *
 * It disappears on its own once the last open job is accepted, by anyone:
 * the count is the server's answer about what is still unassigned, not a
 * local tally, so another agent taking the job empties this card on the
 * next poll exactly as this agent taking it does.
 */
export default function AvailableJobsBadge() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { connected } = useLiveStatus();
  const config = ROLES[user?.role];

  const { data: count } = useQuery(config?.queryKey ?? "gig-jobs-available-count", config?.fetchCount, {
    enabled: Boolean(isAuthenticated && config),
    refetchInterval: connected ? LIVE_POLL_MS : POLL_MS,
    // A dropped poll keeps the last count on screen rather than blanking
    // the card - "no jobs" is a claim, and a failed request isn't evidence
    // for it.
    keepPreviousData: true,
  });

  // Hooked unconditionally (rules of hooks) and harmless when there's no
  // role: a count that stays undefined never rings.
  const { muted, toggleMuted } = useJobAlertSound(count);

  if (!isAuthenticated || !config || !count) return null;
  const Icon = config.icon;

  return (
    <Box sx={{ px: 2.5, pt: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.75,
          borderRadius: 4,
          border: "1px solid #CFEFDD",
          bgcolor: "#E7F7EE",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: 46,
            height: 46,
            borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ color: "#fff", fontSize: 26 }} />
          {/* The number itself, on the icon - this is the badge the count
              belongs to, so it reads at a glance without the sentence. */}
          <Box
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 22,
              height: 22,
              px: 0.5,
              borderRadius: "11px",
              bgcolor: "#E5484D",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #E7F7EE",
            }}
          >
            {count > 99 ? "99+" : count}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {t(config.titleKey, { count })}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("home.jobsBadge.subtitle")}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={toggleMuted}
          aria-label={t(muted ? "home.jobsBadge.unmute" : "home.jobsBadge.mute")}
          title={t(muted ? "home.jobsBadge.unmute" : "home.jobsBadge.mute")}
          sx={{ color: "text.secondary" }}
        >
          {muted ? <VolumeOffRoundedIcon fontSize="small" /> : <VolumeUpRoundedIcon fontSize="small" />}
        </IconButton>

        <Button
          variant="contained"
          size="small"
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={() => router.push(config.href)}
          sx={{ fontWeight: 800, flexShrink: 0, borderRadius: 2 }}
        >
          {t("home.jobsBadge.view")}
        </Button>
      </Box>
    </Box>
  );
}
