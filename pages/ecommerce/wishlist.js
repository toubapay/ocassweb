import { useRouter } from "next/router";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TopBar from "../../src/components/layout/TopBar";
import ProductCard from "../../src/components/ecommerce/ProductCard";
import useAuth from "../../src/hooks/useAuth";
import { fetchWishlist } from "../../src/api/ecommerce";

export default function Wishlist() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: items, isLoading } = useQuery("wishlist", fetchWishlist, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title="Wishlist" showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>Log in to see your wishlist.</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            Log in
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TopBar title="Wishlist" showCart={false} showSearch={false} />
      {isLoading && (
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          Loading...
        </Typography>
      )}
      {!isLoading && (items || []).length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>Your wishlist is empty.</Typography>
          <Button variant="contained" onClick={() => router.push("/ecommerce")}>
            Browse products
          </Button>
        </Box>
      )}
      <Box sx={{ p: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        {(items || []).map((wish) => (
          <ProductCard key={wish.id} product={wish.product} wishlisted />
        ))}
      </Box>
    </Box>
  );
}
