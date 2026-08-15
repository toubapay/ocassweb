import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Avatar from "@mui/material/Avatar";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TopBar from "../../../src/components/layout/TopBar";
import AddressAutocompleteField from "../../../src/components/maps/AddressAutocompleteField";
import useAuth from "../../../src/hooks/useAuth";
import { fetchMyRestaurant, createMyRestaurant, updateMyRestaurant } from "../../../src/api/restaurantOwner";

export default function RestaurantManageDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = isAuthenticated && user?.role === "RESTAURANT_OWNER";

  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: restaurant, isLoading } = useQuery("restaurant-owner-restaurant", fetchMyRestaurant, {
    enabled: isOwner,
  });

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || "");
      setCuisine(restaurant.cuisine || "");
      setAddress(restaurant.address || "");
      setAddressCoords(restaurant.lat != null ? { lat: restaurant.lat, lng: restaurant.lng } : null);
      setLogoUrl(restaurant.logoUrl || "");
    }
  }, [restaurant]);

  const createMutation = useMutation(
    () =>
      createMyRestaurant({
        name,
        cuisine: cuisine || undefined,
        address: address || undefined,
        lat: addressCoords?.lat,
        lng: addressCoords?.lng,
        logoUrl: logoUrl || undefined,
      }),
    {
      onSuccess: () => {
        toast.success(t("restaurant.created"));
        queryClient.invalidateQueries("restaurant-owner-restaurant");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("restaurant.couldNotSaveRestaurant")),
    }
  );

  const updateMutation = useMutation(
    () =>
      updateMyRestaurant({
        name,
        cuisine: cuisine || "",
        address: address || "",
        lat: addressCoords?.lat,
        lng: addressCoords?.lng,
        logoUrl: logoUrl || "",
      }),
    {
      onSuccess: () => {
        toast.success(t("restaurant.updated"));
        queryClient.invalidateQueries("restaurant-owner-restaurant");
        setEditing(false);
      },
      onError: (err) => toast.error(err.response?.data?.message || t("restaurant.couldNotSaveRestaurant")),
    }
  );

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("restaurant.manage.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (!isOwner) {
    return (
      <Box>
        <TopBar title={t("restaurant.manage.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("profile.becomeRestaurantOwner")}</Typography>
          <Button variant="contained" onClick={() => router.push("/restaurant/register")}>
            {t("restaurant.register.getStarted")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <TopBar title={t("restaurant.manage.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  const showForm = !restaurant || editing;

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("restaurant.manage.title")} showCart={false} showSearch={false} />

      {!showForm && (
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar src={restaurant.logoUrl || undefined} sx={{ width: 64, height: 64, bgcolor: "primary.light" }}>
              <RestaurantRoundedIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {restaurant.name}
              </Typography>
              {restaurant.address && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {restaurant.address}
                </Typography>
              )}
              {restaurant.isActive === false && (
                <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
                  {t("restaurant.manage.suspended")}
                </Typography>
              )}
            </Box>
            <Button size="small" onClick={() => setEditing(true)} sx={{ fontWeight: 700 }}>
              {t("restaurant.manage.editRestaurant")}
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<MenuBookRoundedIcon />}
              onClick={() => router.push("/restaurant/manage/items")}
              sx={{ fontWeight: 700, justifyContent: "flex-start", py: 1.5 }}
            >
              {t("restaurant.manage.manageMenu")}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ReceiptLongRoundedIcon />}
              onClick={() => router.push("/restaurant/manage/orders")}
              sx={{ fontWeight: 700, justifyContent: "flex-start", py: 1.5 }}
            >
              {t("restaurant.manage.viewOrders")}
            </Button>
          </Box>
        </Box>
      )}

      {showForm && (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            {restaurant ? t("restaurant.manage.editRestaurant") : t("restaurant.manage.createTitle")}
          </Typography>
          {!restaurant && (
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {t("restaurant.manage.createSubtitle")}
            </Typography>
          )}
          <TextField
            label={t("restaurant.name")}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2, mt: restaurant ? 2 : 0 }}
          />
          <TextField
            label={t("restaurant.cuisine")}
            fullWidth
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            sx={{ mb: 2 }}
          />
          <AddressAutocompleteField
            label={t("restaurant.address")}
            fullWidth
            value={address}
            onTextChange={(v) => {
              setAddress(v);
              setAddressCoords(null);
            }}
            onPlaceSelected={({ address: picked, lat, lng }) => {
              setAddress(picked);
              setAddressCoords({ lat, lng });
            }}
            helperText={t("restaurant.addressHelp")}
            sx={{ mb: 2 }}
          />
          <TextField
            label={t("restaurant.logoUrl")}
            fullWidth
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            {restaurant && (
              <Button
                variant="text"
                onClick={() => {
                  setEditing(false);
                  setName(restaurant.name || "");
                  setCuisine(restaurant.cuisine || "");
                  setAddress(restaurant.address || "");
                  setAddressCoords(restaurant.lat != null ? { lat: restaurant.lat, lng: restaurant.lng } : null);
                  setLogoUrl(restaurant.logoUrl || "");
                }}
                sx={{ fontWeight: 700 }}
              >
                {t("vendor.cancel")}
              </Button>
            )}
            <Button
              variant="contained"
              fullWidth={!restaurant}
              disabled={!name || createMutation.isLoading || updateMutation.isLoading}
              onClick={() => (restaurant ? updateMutation.mutate() : createMutation.mutate())}
              sx={{ fontWeight: 800, py: 1.25 }}
            >
              {restaurant ? t("vendor.saveChanges") : t("restaurant.manage.createRestaurant")}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
