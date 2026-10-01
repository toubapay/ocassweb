import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../src/api/notifications";

function timeAgo(dateStr, locale) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return locale === "fr" ? "à l'instant" : "just now";
  if (mins < 60) return locale === "fr" ? `il y a ${mins} min` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return locale === "fr" ? `il y a ${hours} h` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return locale === "fr" ? `il y a ${days} j` : `${days}d ago`;
}

/**
 * Where tapping a notification goes.
 *
 * `data.role` says which side of the job this row belongs to (written by
 * delivery.notify.js / rideshare.notify.js), and the two sides belong on
 * different screens: the customer wants the tracking page for that one
 * delivery, the agent wants the board where their jobs are. Sending both
 * to the same place would strand one of them.
 *
 * Anything with no recognised pointer stays a plain, unclickable row
 * rather than navigating somewhere arbitrary.
 */
function notificationTarget(n) {
  const data = n.data || {};
  if (data.deliveryRequestId) {
    return data.role === "AGENT" ? "/delivery/agent?tab=mine" : `/delivery/track/${data.deliveryRequestId}`;
  }
  if (data.rideRequestId) {
    return data.role === "RIDER" ? "/ride-sharing/driver?tab=mine" : "/ride-sharing";
  }
  if (data.postingId) return "/anando";
  return null;
}

/** A parcel is not a car - an inbox of mixed jobs has to be skimmable. */
function notificationIcon(n) {
  return (n.data || {}).deliveryRequestId ? TwoWheelerRoundedIcon : DirectionsCarFilledRoundedIcon;
}

export default function Notifications() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery("notifications", fetchNotifications, {
    enabled: isAuthenticated,
  });

  const invalidate = () => {
    queryClient.invalidateQueries("notifications");
    queryClient.invalidateQueries("notifications-unread-count");
  };

  const readMutation = useMutation((id) => markNotificationRead(id), { onSuccess: invalidate });
  const readAllMutation = useMutation(() => markAllNotificationsRead(), { onSuccess: invalidate });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("notifications.title")} showSearch={false} showCart={false} showNotifications={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  const hasUnread = (notifications || []).some((n) => !n.read);

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("notifications.title")} showSearch={false} showCart={false} showNotifications={false} />

      {hasUnread && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, pt: 1.5 }}>
          <Button
            size="small"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isLoading}
            sx={{ fontWeight: 700 }}
          >
            {t("notifications.markAllRead")}
          </Button>
        </Box>
      )}

      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          {t("common.loading")}
        </Typography>
      )}

      {!isLoading && (notifications || []).length === 0 && (
        <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
          <NotificationsNoneRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">{t("notifications.empty")}</Typography>
        </Box>
      )}

      <Box sx={{ px: 2, pt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(notifications || []).map((n) => {
          const target = notificationTarget(n);
          const Icon = notificationIcon(n);
          return (
          <Box
            key={n.id}
            onClick={() => {
              if (!n.read) readMutation.mutate(n.id);
              if (target) router.push(target);
            }}
            sx={{
              display: "flex",
              gap: 1.5,
              p: 1.75,
              borderRadius: 3,
              border: "1px solid #EEEEEE",
              bgcolor: n.read ? "background.paper" : "#FDF1F7",
              cursor: target ? "pointer" : "default",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "#FDF1F7",
                color: "#EC4899",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: n.read ? 600 : 800 }}>
                {n.title}
              </Typography>
              {n.body && (
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5, mt: 0.25 }}>
                  {n.body}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                {timeAgo(n.createdAt, i18n.language)}
              </Typography>
            </Box>
            {!n.read && (
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#EC4899", flexShrink: 0, mt: 0.75 }} />
            )}
          </Box>
          );
        })}
      </Box>
    </Box>
  );
}
