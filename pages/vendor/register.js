import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyStore, createStore } from "../../src/api/vendor";

function PitchPoint({ icon: Icon, title, body }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: "primary.light",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ color: "primary.main" }} />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {body}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Guided "onboard a business" entry point - a dedicated landing/signup
 * page rather than the plain role-toggle button buried in profile.js.
 * Reuses the existing phone/OTP auth pages (via ?redirect=) for the
 * identity step rather than re-implementing phone input here, then walks
 * a fresh or returning user through role + store creation in one place.
 */
export default function VendorRegister() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user, updateRole } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const { data: store, isLoading: storeLoading } = useQuery("vendor-store", fetchMyStore, {
    enabled: isAuthenticated,
  });

  const alreadyOnboarded = isAuthenticated && user?.role === "VENDOR" && !!store;

  useEffect(() => {
    if (alreadyOnboarded) {
      router.replace("/vendor");
    }
  }, [alreadyOnboarded, router]);

  const onboardMutation = useMutation(
    async () => {
      if (user.role !== "VENDOR") {
        await updateRole("VENDOR");
      }
      return createStore({ name, address: address || undefined, logoUrl: logoUrl || undefined });
    },
    {
      onSuccess: () => {
        toast.success(t("vendor.register.success"));
        router.push("/vendor");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveStore")),
    }
  );

  const handleSubmit = () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error(t("vendor.register.nameRequired"));
      return;
    }
    onboardMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("vendor.register.title")} showCart={false} showSearch={false} />
        <Box sx={{ px: 3, pt: 2, pb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            {t("vendor.register.heroTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            {t("vendor.register.heroSubtitle")}
          </Typography>

          <PitchPoint
            icon={StorefrontRoundedIcon}
            title={t("vendor.register.pitchStoreTitle")}
            body={t("vendor.register.pitchStoreBody")}
          />
          <PitchPoint
            icon={Inventory2RoundedIcon}
            title={t("vendor.register.pitchCatalogTitle")}
            body={t("vendor.register.pitchCatalogBody")}
          />
          <PitchPoint
            icon={PeopleAltRoundedIcon}
            title={t("vendor.register.pitchReachTitle")}
            body={t("vendor.register.pitchReachBody")}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => router.push("/auth/login?redirect=/vendor/register")}
            sx={{ py: 1.5, fontWeight: 700, mt: 2 }}
          >
            {t("vendor.register.getStarted")}
          </Button>
          <Button
            variant="text"
            fullWidth
            onClick={() => router.push("/vendor/login")}
            sx={{ mt: 1 }}
          >
            {t("vendor.register.alreadyHaveStore")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (storeLoading || alreadyOnboarded) {
    return (
      <Box>
        <TopBar title={t("vendor.register.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("vendor.register.title")} showCart={false} showSearch={false} />
      <Box sx={{ px: 3, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t("vendor.register.formTitle")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          {t("vendor.register.formSubtitle")}
        </Typography>

        <TextField
          label={t("vendor.storeName")}
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label={t("vendor.storeAddress")}
          fullWidth
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label={t("vendor.storeLogoUrl")}
          fullWidth
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={onboardMutation.isLoading}
          onClick={handleSubmit}
          sx={{ py: 1.5, fontWeight: 700 }}
        >
          {onboardMutation.isLoading ? t("common.loading") : t("vendor.register.submit")}
        </Button>
      </Box>
    </Box>
  );
}
