import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import TopBar from "../../src/components/layout/TopBar";
import { fetchCart, createOrder } from "../../src/api/ecommerce";
import useAuth from "../../src/hooks/useAuth";
import { formatCfa } from "../../src/utils/currency";

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery("cart", fetchCart);

  const orderMutation = useMutation(() => createOrder(), {
    onSuccess: ({ paymentUrl }) => {
      queryClient.invalidateQueries("cart");
      queryClient.invalidateQueries("orders");
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.success("Order placed!");
        router.push(`/ecommerce/orders`);
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || "Could not place order"),
  });

  const subtotal = (items || []).reduce((sum, item) => {
    const unit = Number(item.product.discountPrice ?? item.product.price);
    return sum + unit * item.quantity;
  }, 0);
  const deliveryFee = subtotal > 0 ? 500 : 0;
  const total = subtotal + deliveryFee;

  return (
    <Box sx={{ pb: 12 }}>
      <TopBar title="Checkout" showCart={false} showSearch={false} />

      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Delivery to
        </Typography>
        <Box sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2, mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {user?.name || "You"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {user?.phone}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Add a saved address to speed up future orders.
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Order summary
        </Typography>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Loading...
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
            Subtotal
          </Typography>
          <Typography variant="body2">{formatCfa(subtotal)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Delivery fee
          </Typography>
          <Typography variant="body2">{formatCfa(deliveryFee)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Total
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {formatCfa(total)}
          </Typography>
        </Box>
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
          onClick={() => orderMutation.mutate()}
          sx={{ fontWeight: 800, py: 1.25 }}
        >
          {orderMutation.isLoading ? "Placing order..." : `Place order · ${formatCfa(total)}`}
        </Button>
      </Box>
    </Box>
  );
}
