import { useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient, useMutation } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Rating from "@mui/material/Rating";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TopBar from "../../../src/components/layout/TopBar";
import { fetchProduct, addToCart } from "../../../src/api/ecommerce";
import useAuth from "../../../src/hooks/useAuth";
import { formatCfa } from "../../../src/utils/currency";

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery(["product", slug], () => fetchProduct(slug), {
    enabled: Boolean(slug),
  });

  const addMutation = useMutation(() => addToCart(product.id, quantity), {
    onSuccess: () => {
      toast.success("Added to cart");
      queryClient.invalidateQueries("cart");
    },
    onError: () => toast.error("Could not add to cart"),
  });

  if (isLoading || !product) {
    return (
      <Box>
        <TopBar title="Product" />
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Loading product...
          </Typography>
        </Box>
      </Box>
    );
  }

  const hasDiscount = Boolean(product.discountPrice);
  const displayPrice = hasDiscount ? product.discountPrice : product.price;

  const handleAdd = () => {
    if (!isAuthenticated) {
      toast("Log in to continue");
      router.push("/auth/login");
      return;
    }
    addMutation.mutate();
  };

  return (
    <Box sx={{ pb: 10 }}>
      <TopBar title={product.category?.name || "Product"} />

      <Box
        component="img"
        src={product.images?.[activeImage] || product.images?.[0]}
        alt={product.name}
        sx={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }}
      />
      {product.images?.length > 1 && (
        <Box sx={{ display: "flex", gap: 1, p: 1.5, overflowX: "auto" }}>
          {product.images.map((img, i) => (
            <Box
              key={img}
              component="img"
              src={img}
              onClick={() => setActiveImage(i)}
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                objectFit: "cover",
                cursor: "pointer",
                border: i === activeImage ? "2px solid" : "2px solid transparent",
                borderColor: i === activeImage ? "primary.main" : "transparent",
              }}
            />
          ))}
        </Box>
      )}

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
          {product.store?.name}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
          {product.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            ({product.rating?.toFixed(1)})
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {formatCfa(displayPrice)}
          </Typography>
          {hasDiscount && (
            <>
              <Typography variant="body2" sx={{ color: "text.secondary", textDecoration: "line-through" }}>
                {formatCfa(product.price)}
              </Typography>
              <Chip label={`${product.discountPercent}% OFF`} size="small" color="primary" sx={{ fontWeight: 700 }} />
            </>
          )}
        </Box>

        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Description
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {product.description || "No description available."}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Reviews ({product.reviews?.length || 0})
        </Typography>
        {(product.reviews || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No reviews yet.
          </Typography>
        )}
        {(product.reviews || []).map((review) => (
          <Box key={review.id} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {review.user?.name || "Anonymous"}
              </Typography>
              <Rating value={review.rating} size="small" readOnly />
            </Box>
            {review.comment && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {review.comment}
              </Typography>
            )}
          </Box>
        ))}
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
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", border: "1px solid #EEEEEE", borderRadius: 2 }}>
          <IconButton size="small" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            <RemoveRoundedIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ px: 1.5, fontWeight: 700 }}>{quantity}</Typography>
          <IconButton size="small" onClick={() => setQuantity((q) => q + 1)}>
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={addMutation.isLoading || product.stock === 0}
          onClick={handleAdd}
          sx={{ fontWeight: 800, py: 1.25 }}
        >
          Add to cart
        </Button>
      </Box>
    </Box>
  );
}
