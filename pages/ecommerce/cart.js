import { useRouter } from "next/router";
import { useQuery, useQueryClient, useMutation } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchCart, updateCartItem, removeCartItem } from "../../src/api/ecommerce";
import { formatCfa } from "../../src/utils/currency";

export default function Cart() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery("cart", fetchCart, { enabled: isAuthenticated });

  const updateMutation = useMutation(({ id, quantity }) => updateCartItem(id, quantity), {
    onSuccess: () => queryClient.invalidateQueries("cart"),
  });
  const removeMutation = useMutation((id) => removeCartItem(id), {
    onSuccess: () => queryClient.invalidateQueries("cart"),
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title="Cart" showCart={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Log in to view your cart.
          </Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            Log in
          </Button>
        </Box>
      </Box>
    );
  }

  const subtotal = (items || []).reduce((sum, item) => {
    const unit = Number(item.product.discountPrice ?? item.product.price);
    return sum + unit * item.quantity;
  }, 0);

  return (
    <Box sx={{ pb: 12 }}>
      <TopBar title="Your cart" showCart={false} showSearch={false} />

      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          Loading cart...
        </Typography>
      )}

      {!isLoading && (items || []).length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Your cart is empty.
          </Typography>
          <Button variant="contained" onClick={() => router.push("/ecommerce")}>
            Start shopping
          </Button>
        </Box>
      )}

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(items || []).map((item) => {
          const unit = Number(item.product.discountPrice ?? item.product.price);
          return (
            <Box key={item.id} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Box
                component="img"
                src={item.product.images?.[0]}
                sx={{ width: 64, height: 64, borderRadius: 2, objectFit: "cover" }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {item.product.name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.25 }}>
                  {formatCfa(unit)}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", border: "1px solid #EEEEEE", borderRadius: 2 }}>
                    <IconButton
                      size="small"
                      onClick={() =>
                        updateMutation.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })
                      }
                    >
                      <RemoveRoundedIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ px: 1, fontWeight: 700, fontSize: 14 }}>{item.quantity}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                    >
                      <AddRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <IconButton size="small" onClick={() => removeMutation.mutate(item.id)}>
                    <DeleteOutlineRoundedIcon fontSize="small" sx={{ color: "error.main" }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {(items || []).length > 0 && (
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
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Subtotal
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {formatCfa(subtotal)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            fullWidth
            size="large"
            sx={{ fontWeight: 800, py: 1.25 }}
            onClick={() => router.push("/ecommerce/checkout")}
          >
            Checkout
          </Button>
        </Box>
      )}
    </Box>
  );
}
