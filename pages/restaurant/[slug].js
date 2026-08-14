import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Rating from "@mui/material/Rating";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TopBar from "../../src/components/layout/TopBar";
import AddressAutocompleteField from "../../src/components/maps/AddressAutocompleteField";
import useAuth from "../../src/hooks/useAuth";
import { fetchRestaurant, createRestaurantOrder } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

export default function RestaurantDetail() {
  const router = useRouter();
  const { t } = useTranslation();
  const { slug } = router.query;
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState(null);

  const { data: restaurant, isLoading } = useQuery(
    ["restaurant", slug],
    () => fetchRestaurant(slug),
    { enabled: Boolean(slug) }
  );

  const menuItemById = useMemo(() => {
    const map = new Map();
    (restaurant?.menuItems || []).forEach((item) => map.set(item.id, item));
    return map;
  }, [restaurant]);

  const cartEntries = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const total = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItemById.get(id);
    return sum + (item ? Number(item.price) * qty : 0);
  }, 0);
  const itemCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);

  const orderMutation = useMutation(
    () =>
      createRestaurantOrder(slug, {
        items: cartEntries.map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
        deliveryAddress,
        deliveryLat: deliveryCoords?.lat,
        deliveryLng: deliveryCoords?.lng,
      }),
    {
      onSuccess: () => {
        toast.success(t("restaurant.detail.orderPlaced"));
        queryClient.invalidateQueries("restaurant-orders");
        queryClient.invalidateQueries("wallet");
        setQuantities({});
        setCheckoutOpen(false);
        setDeliveryAddress("");
        setDeliveryCoords(null);
        router.push("/restaurant/orders");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("restaurant.detail.couldNotPlaceOrder")),
    }
  );

  const setQuantity = (itemId, qty) => {
    if (!isAuthenticated) {
      toast(t("restaurant.detail.loginToOrder"));
      router.push("/auth/login");
      return;
    }
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
  };

  const handleConfirmOrder = () => {
    if (!deliveryAddress.trim()) {
      toast.error(t("restaurant.detail.enterDeliveryAddress"));
      return;
    }
    orderMutation.mutate();
  };

  if (isLoading || !restaurant) {
    return (
      <Box>
        <TopBar title={t("restaurant.detail.title")} showCart={false} />
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          {t("restaurant.detail.loading")}
        </Typography>
      </Box>
    );
  }

  if (restaurant.isActive === false) {
    return (
      <Box>
        <TopBar title={restaurant.name} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("restaurant.detail.unavailable")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: cartEntries.length > 0 ? 12 : 4 }}>
      <TopBar title={restaurant.name} showCart={false} showSearch={false} />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {restaurant.cuisine} · {restaurant.address}
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <Rating value={restaurant.rating} precision={0.1} size="small" readOnly />
        </Box>
      </Box>

      <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(restaurant.menuItems || []).map((item) => {
          const qty = quantities[item.id] || 0;
          return (
            <Box
              key={item.id}
              sx={{ display: "flex", gap: 1.5, alignItems: "center", border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}
            >
              <Box component="img" src={item.imageUrl} sx={{ width: 56, height: 56, borderRadius: 2, objectFit: "cover" }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {item.name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {formatCfa(item.price)}
                </Typography>
              </Box>
              {qty === 0 ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setQuantity(item.id, 1)}
                  sx={{ fontWeight: 800 }}
                >
                  {t("restaurant.detail.add")}
                </Button>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", border: "1px solid #EEEEEE", borderRadius: 2 }}>
                  <IconButton size="small" onClick={() => setQuantity(item.id, qty - 1)}>
                    <RemoveRoundedIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ px: 1, fontWeight: 700, fontSize: 14 }}>{qty}</Typography>
                  <IconButton size="small" onClick={() => setQuantity(item.id, qty + 1)}>
                    <AddRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {cartEntries.length > 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            bgcolor: "background.paper",
            borderTop: "1px solid #EEEEEE",
            p: 2,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => setCheckoutOpen(true)}
            sx={{ fontWeight: 800, py: 1.25 }}
          >
            {t("restaurant.detail.placeOrder", { count: itemCount, total: formatCfa(total) })}
          </Button>
        </Box>
      )}

      <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("restaurant.detail.checkoutTitle")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {t("restaurant.detail.checkoutSubtitle")}
          </Typography>
          <AddressAutocompleteField
            label={t("restaurant.detail.deliveryAddress")}
            fullWidth
            value={deliveryAddress}
            onTextChange={(v) => {
              setDeliveryAddress(v);
              setDeliveryCoords(null);
            }}
            onPlaceSelected={({ address, lat, lng }) => {
              setDeliveryAddress(address);
              setDeliveryCoords({ lat, lng });
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 800, mt: 2 }}>
            {t("restaurant.detail.payWithWallet", { amount: formatCfa(total) })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCheckoutOpen(false)}>{t("vendor.cancel")}</Button>
          <Button
            variant="contained"
            disabled={orderMutation.isLoading}
            onClick={handleConfirmOrder}
            sx={{ fontWeight: 700 }}
          >
            {orderMutation.isLoading ? t("restaurant.detail.placingOrder") : t("restaurant.detail.confirmAndPay")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
