import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import TopBar from "../../src/components/layout/TopBar";
import { fetchCart, createOrder } from "../../src/api/ecommerce";
import { fetchWallet } from "../../src/api/wallet";
import useAuth from "../../src/hooks/useAuth";
import { formatCfa } from "../../src/utils/currency";

export default function Checkout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState("paydunya");

  const { data: items, isLoading } = useQuery("cart", fetchCart);
  const { data: wallet } = useQuery("wallet", fetchWallet, { enabled: isAuthenticated });

  const orderMutation = useMutation((method) => createOrder(undefined, method), {
    onSuccess: ({ paymentUrl }) => {
      queryClient.invalidateQueries("cart");
      queryClient.invalidateQueries("orders");
      queryClient.invalidateQueries("wallet");
      queryClient.invalidateQueries("wallet-transactions");
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.success(t("ecommerce.checkout.orderPlaced"));
        router.push(`/ecommerce/orders`);
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || t("ecommerce.checkout.couldNotPlaceOrder")),
  });

  const subtotal = (items || []).reduce((sum, item) => {
    const unit = Number(item.product.discountPrice ?? item.product.price);
    return sum + unit * item.quantity;
  }, 0);
  const deliveryFee = subtotal > 0 ? 500 : 0;
  const total = subtotal + deliveryFee;

  return (
    <Box sx={{ pb: 12 }}>
      <TopBar title={t("ecommerce.checkout.title")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          {t("ecommerce.checkout.deliveryTo")}
        </Typography>
        <Box sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2, mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {user?.name || t("ecommerce.checkout.you")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {user?.phone}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("ecommerce.checkout.addAddressHint")}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          {t("ecommerce.checkout.orderSummary")}
        </Typography>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("ecommerce.checkout.loading")}
          </Typography>
        )}
        {(items || []).map((item) => (
          <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {item.quantity} x {item.product.name}
            </Typography>
            <Typography variant="body2">
              {formatCfa(Number(item.product.discountPrice ?? item.product.price) * item.quantity)}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("ecommerce.checkout.subtotal")}
          </Typography>
          <Typography variant="body2">{formatCfa(subtotal)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("ecommerce.checkout.deliveryFee")}
          </Typography>
          <Typography variant="body2">{formatCfa(deliveryFee)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("ecommerce.checkout.total")}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {formatCfa(total)}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          {t("ecommerce.checkout.payWith")}
        </Typography>
        <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <Box sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1, mb: 1 }}>
            <FormControlLabel
              value="paydunya"
              control={<Radio />}
              sx={{ width: "100%", m: 0 }}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                  <CreditCardRoundedIcon sx={{ color: "primary.main" }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {t("ecommerce.checkout.payDunya")}
                  </Typography>
                </Box>
              }
            />
          </Box>
          <Box sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1 }}>
            <FormControlLabel
              value="wallet"
              control={<Radio />}
              disabled={!wallet || Number(wallet.balance) < total}
              sx={{ width: "100%", m: 0 }}
              label={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", py: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccountBalanceWalletRoundedIcon sx={{ color: "primary.main" }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t("ecommerce.checkout.wallet")}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {wallet ? t("ecommerce.checkout.walletBalance", { amount: formatCfa(wallet.balance) }) : "..."}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </RadioGroup>
      </Box>

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
          disabled={orderMutation.isLoading || (items || []).length === 0}
          onClick={() => orderMutation.mutate(paymentMethod)}
          sx={{ fontWeight: 800, py: 1.25 }}
        >
          {orderMutation.isLoading
            ? t("ecommerce.checkout.placingOrder")
            : t("ecommerce.checkout.placeOrder", { total: formatCfa(total) })}
        </Button>
      </Box>
    </Box>
  );
}
