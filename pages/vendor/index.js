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
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyStore, createStore, updateStore } from "../../src/api/vendor";

export default function VendorDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const isVendor = isAuthenticated && user?.role === "VENDOR";

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: store, isLoading } = useQuery("vendor-store", fetchMyStore, {
    enabled: isVendor,
  });

  useEffect(() => {
    if (store) {
      setName(store.name || "");
      setAddress(store.address || "");
      setLogoUrl(store.logoUrl || "");
    }
  }, [store]);

  const createMutation = useMutation(
    () => createStore({ name, address: address || undefined, logoUrl: logoUrl || undefined }),
    {
      onSuccess: () => {
        toast.success(t("vendor.storeCreated"));
        queryClient.invalidateQueries("vendor-store");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveStore")),
    }
  );

  const updateMutation = useMutation(
    () => updateStore({ name, address: address || "", logoUrl: logoUrl || "" }),
    {
      onSuccess: () => {
        toast.success(t("vendor.storeUpdated"));
        queryClient.invalidateQueries("vendor-store");
        setEditing(false);
      },
      onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveStore")),
    }
  );

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("vendor.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (!isVendor) {
    return (
      <Box>
        <TopBar title={t("vendor.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("profile.becomeVendor")}</Typography>
          <Button variant="contained" onClick={() => router.push("/profile")}>
            {t("nav.profile")}
          </Button>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <TopBar title={t("vendor.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        </Box>
      </Box>
    );
  }

  const showForm = !store || editing;

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("vendor.title")} showCart={false} showSearch={false} />

      {!showForm && (
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar src={store.logoUrl || undefined} sx={{ width: 64, height: 64, bgcolor: "primary.light" }}>
              <StorefrontRoundedIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {store.name}
              </Typography>
              {store.address && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {store.address}
                </Typography>
              )}
            </Box>
            <Button size="small" onClick={() => setEditing(true)} sx={{ fontWeight: 700 }}>
              {t("vendor.editStore")}
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Inventory2RoundedIcon />}
              onClick={() => router.push("/vendor/products")}
              sx={{ fontWeight: 700, justifyContent: "flex-start", py: 1.5 }}
            >
              {t("vendor.manageProducts")}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ReceiptLongRoundedIcon />}
              onClick={() => router.push("/vendor/orders")}
              sx={{ fontWeight: 700, justifyContent: "flex-start", py: 1.5 }}
            >
              {t("vendor.viewOrders")}
            </Button>
          </Box>
        </Box>
      )}

      {showForm && (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            {store ? t("vendor.editStore") : t("vendor.createStoreTitle")}
          </Typography>
          {!store && (
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {t("vendor.createStoreSubtitle")}
            </Typography>
          )}
          <TextField
            label={t("vendor.storeName")}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2, mt: store ? 2 : 0 }}
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
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            {store && (
              <Button
                variant="text"
                onClick={() => {
                  setEditing(false);
                  setName(store.name || "");
                  setAddress(store.address || "");
                  setLogoUrl(store.logoUrl || "");
                }}
                sx={{ fontWeight: 700 }}
              >
                {t("vendor.cancel")}
              </Button>
            )}
            <Button
              variant="contained"
              fullWidth={!store}
              disabled={!name || createMutation.isLoading || updateMutation.isLoading}
              onClick={() => (store ? updateMutation.mutate() : createMutation.mutate())}
              sx={{ fontWeight: 800, py: 1.25 }}
            >
              {store ? t("vendor.saveChanges") : t("vendor.createStore")}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
