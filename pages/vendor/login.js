import { useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";

/**
 * Dedicated "vendor entrance" - a separate, findable login for a
 * returning business owner rather than expecting them to know to log in
 * through the plain customer /auth/login and then hunt for the vendor
 * dashboard. Reuses the same phone/OTP backend as every other login in
 * this app (no separate vendor auth system) via ?redirect=/vendor.
 */
export default function VendorLogin() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const isVendor = isAuthenticated && Boolean(user?.store);

  useEffect(() => {
    if (isVendor) {
      router.replace("/vendor");
    }
  }, [isVendor, router]);

  if (isAuthenticated && !isVendor) {
    return (
      <Box>
        <TopBar title={t("vendor.login.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("vendor.login.notAVendorYet")}</Typography>
          <Button variant="contained" onClick={() => router.push("/vendor/register")}>
            {t("vendor.register.getStarted")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isVendor) {
    return (
      <Box>
        <TopBar title={t("vendor.login.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TopBar title={t("vendor.login.title")} showCart={false} showSearch={false} />
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: 3,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: "primary.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <StorefrontRoundedIcon sx={{ color: "primary.main", fontSize: 32 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          {t("vendor.login.heading")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          {t("vendor.login.subheading")}
        </Typography>

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => router.push("/auth/login?redirect=/vendor")}
          sx={{ py: 1.5, fontWeight: 700, maxWidth: 360 }}
        >
          {t("vendor.login.logIn")}
        </Button>
        <Button variant="text" fullWidth sx={{ mt: 1, maxWidth: 360 }} onClick={() => router.push("/vendor/register")}>
          {t("vendor.login.newBusiness")}
        </Button>
      </Box>
    </Box>
  );
}
