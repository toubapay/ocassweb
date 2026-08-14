import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import DeliveryDiningRoundedIcon from "@mui/icons-material/DeliveryDiningRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyRestaurant, createMyRestaurant } from "../../src/api/restaurantOwner";

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
 * Guided "onboard a restaurant" entry point, mirroring /vendor/register -
 * reuses the existing phone/OTP auth pages (via ?redirect=) for identity,
 * then walks a fresh or returning owner through role + restaurant
 * creation in one place.
 */
export default function RestaurantRegister() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user, updateRole } = useAuth();

  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const { data: restaurant, isLoading: restaurantLoading } = useQuery(
    "restaurant-owner-restaurant",
    fetchMyRestaurant,
    { enabled: isAuthenticated }
  );

  const alreadyOnboarded = isAuthenticated && user?.role === "RESTAURANT_OWNER" && !!restaurant;

  useEffect(() => {
    if (alreadyOnboarded) {
      router.replace("/restaurant/manage");
    }
  }, [alreadyOnboarded, router]);

  const onboardMutation = useMutation(
    async () => {
      if (user.role !== "RESTAURANT_OWNER") {
        await updateRole("RESTAURANT_OWNER");
      }
      return createMyRestaurant({
        name,
        cuisine: cuisine || undefined,
        address: address || undefined,
        logoUrl: logoUrl || undefined,
      });
    },
    {
      onSuccess: () => {
        toast.success(t("restaurant.register.success"));
        router.push("/restaurant/manage");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("restaurant.couldNotSaveRestaurant")),
    }
  );

  const handleSubmit = () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error(t("restaurant.register.nameRequired"));
      return;
    }
    onboardMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("restaurant.register.title")} showCart={false} showSearch={false} />
        <Box sx={{ px: 3, pt: 2, pb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            {t("restaurant.register.heroTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            {t("restaurant.register.heroSubtitle")}
          </Typography>

          <PitchPoint
            icon={RestaurantRoundedIcon}
            title={t("restaurant.register.pitchListingTitle")}
            body={t("restaurant.register.pitchListingBody")}
          />
          <PitchPoint
            icon={MenuBookRoundedIcon}
            title={t("restaurant.register.pitchMenuTitle")}
            body={t("restaurant.register.pitchMenuBody")}
          />
          <PitchPoint
            icon={DeliveryDiningRoundedIcon}
            title={t("restaurant.register.pitchDeliveryTitle")}
            body={t("restaurant.register.pitchDeliveryBody")}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => router.push("/auth/login?redirect=/restaurant/register")}
            sx={{ py: 1.5, fontWeight: 700, mt: 2 }}
          >
            {t("restaurant.register.getStarted")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (restaurantLoading || alreadyOnboarded) {
    return (
      <Box>
        <TopBar title={t("restaurant.register.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("restaurant.register.title")} showCart={false} showSearch={false} />
      <Box sx={{ px: 3, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t("restaurant.register.formTitle")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          {t("restaurant.register.formSubtitle")}
        </Typography>

        <TextField
          label={t("restaurant.name")}
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label={t("restaurant.cuisine")}
          fullWidth
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label={t("restaurant.address")}
          fullWidth
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          helperText={t("restaurant.addressHelp")}
          sx={{ mb: 2 }}
        />
        <TextField
          label={t("restaurant.logoUrl")}
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
          {onboardMutation.isLoading ? t("common.loading") : t("restaurant.register.submit")}
        </Button>
      </Box>
    </Box>
  );
}
