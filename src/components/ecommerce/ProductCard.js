import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQueryClient, useMutation } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import { addToCart, toggleWishlist } from "../../api/ecommerce";
import useAuth from "../../hooks/useAuth";
import { formatCfa } from "../../utils/currency";

export default function ProductCard({ product, wishlisted = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const addMutation = useMutation((id) => addToCart(id, 1), {
    onSuccess: () => {
      toast.success(t("ecommerce.productCard.addedToCart", { name: product.name }));
      queryClient.invalidateQueries("cart");
    },
    onError: () => toast.error(t("ecommerce.productCard.couldNotAddToCart")),
  });

  const wishlistMutation = useMutation((id) => toggleWishlist(id), {
    onSuccess: () => queryClient.invalidateQueries("wishlist"),
  });

  const requireLogin = (action) => {
    if (!isAuthenticated) {
      toast(t("common.logInToContinue"));
      router.push("/auth/login");
      return;
    }
    action();
  };

  const hasDiscount = Boolean(product.discountPrice);
  const displayPrice = hasDiscount ? product.discountPrice : product.price;

  return (
    <Card sx={{ borderRadius: 3, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{ position: "relative", cursor: "pointer" }}
        onClick={() => router.push(`/ecommerce/product/${product.slug}`)}
      >
        <Box
          component="img"
          src={product.images?.[0]}
          alt={product.name}
          sx={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
        />
        {hasDiscount && (
          <Chip
            icon={<LocalOfferRoundedIcon sx={{ fontSize: 14, color: "#fff !important" }} />}
            label={t("ecommerce.product.percentOff", { percent: product.discountPercent })}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              bgcolor: "primary.main",
              color: "#fff",
              fontWeight: 700,
              fontSize: 11,
            }}
          />
        )}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            requireLogin(() => wishlistMutation.mutate(product.id));
          }}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            bgcolor: "rgba(255,255,255,0.85)",
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          {wishlisted ? (
            <FavoriteRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          ) : (
            <FavoriteBorderRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          )}
        </IconButton>
      </Box>

      <Box sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 0.5, flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, cursor: "pointer" }}
          onClick={() => router.push(`/ecommerce/product/${product.slug}`)}
        >
          {product.name}
        </Typography>
        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
          {product.store?.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {formatCfa(displayPrice)}
          </Typography>
          {hasDiscount && (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", textDecoration: "line-through" }}
            >
              {formatCfa(product.price)}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          disabled={addMutation.isLoading}
          onClick={() => requireLogin(() => addMutation.mutate(product.id))}
          sx={{ mt: "auto", fontWeight: 800, letterSpacing: 0.5 }}
        >
          {t("ecommerce.productCard.add")}
        </Button>
      </Box>
    </Card>
  );
}
