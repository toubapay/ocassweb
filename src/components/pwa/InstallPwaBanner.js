import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InstallMobileRoundedIcon from "@mui/icons-material/InstallMobileRounded";
import usePwaInstall from "../../hooks/usePwaInstall";

const DISMISSED_KEY = "ocass-pwa-banner-dismissed-at";
// Re-offer the install banner after this long, rather than hiding it
// forever on one dismissal - a user who said "not now" on day one may
// still want it after using the app a few more times.
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export default function InstallPwaBanner({ bottomOffset }) {
  const { t } = useTranslation();
  const { installed, canPromptInstall, promptInstall, isIos } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const lastDismissed = Number(window.localStorage.getItem(DISMISSED_KEY) || 0);
    setDismissed(Date.now() - lastDismissed < COOLDOWN_MS);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  };

  const visible = !installed && !dismissed && (canPromptInstall || isIos);
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: bottomOffset,
        width: "calc(100% - 24px)",
        maxWidth: 456,
        zIndex: 1200,
        bgcolor: "#1A1A1A",
        color: "#fff",
        borderRadius: 3,
        p: 1.75,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <InstallMobileRoundedIcon sx={{ color: "primary.main", flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t("pwa.installTitle")}
        </Typography>
        <Typography variant="caption" sx={{ color: "grey.400", display: "block" }}>
          {isIos && !canPromptInstall ? t("pwa.installHintIos") : t("pwa.installHint")}
        </Typography>
      </Box>
      {canPromptInstall && (
        <Button
          size="small"
          variant="contained"
          onClick={async () => {
            await promptInstall();
            dismiss();
          }}
          sx={{ flexShrink: 0, fontWeight: 700 }}
        >
          {t("pwa.install")}
        </Button>
      )}
      <IconButton size="small" onClick={dismiss} sx={{ color: "grey.400", flexShrink: 0 }}>
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
