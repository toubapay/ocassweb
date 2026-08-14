import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Rating from "@mui/material/Rating";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TopBar from "../../src/components/layout/TopBar";
import ProductCard from "../../src/components/ecommerce/ProductCard";
import { fetchStoreBySlug } from "../../src/api/vendor";
import { fetchProducts, fetchWishlist } from "../../src/api/ecommerce";
import useAuth from "../../src/hooks/useAuth";

/**
 * Shopper-facing storefront for one vendor - filters the same product
 * listing endpoint the category browse page uses
 * (GET /ecommerce/products?store=<slug>), just scoped to one store
 * instead of one category. Linked from the category page's "Stores" tab.
 */
export default function StoreBrowse() {
  const router = useRouter();
  const { t } = useTranslation();
  const { slug } = router.query;
  const { isAuthenticated } = useAuth();

  const { data: store, isLoading: storeLoading } = useQuery(
    ["store", slug],
    () => fetchStoreBySlug(slug),
    { enabled: Boolean(slug) }
  );

  const { data, isLoading: productsLoading } = useQuery(
    ["products", "store", slug],
    () => fetchProducts({ store: slug, pageSize: 40 }),
    { enabled: Boolean(slug) }
  );

  const { data: wishlist } = useQuery("wishlist", fetchWishlist, { enabled: isAuthenticated });
  const wishlistedIds = new Set((wishlist || []).map((w) => w.productId));

  if (!storeLoading && !store) {
    return (
      <Box>
        <TopBar title={t("store.title")} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("store.notFound")}</Typography>
        </Box>
      </Box>
    );
  }

  if (store && store.isActive === false) {
    return (
      <Box>
        <TopBar title={store.name} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>{t("store.unavailable")}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3 }}>
      <TopBar title={store?.name || t("store.title")} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2 }}>
        <Avatar src={store?.logoUrl || undefined} sx={{ width: 56, height: 56, bgcolor: "primary.light" }}>
          <StorefrontRoundedIcon />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {store?.name}
          </Typography>
          {typeof store?.rating === "number" && (
            <Rating value={store.rating} precision={0.1} size="small" readOnly />
          )}
          {store?.address && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              <LocationOnRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {store.address}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        {productsLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
            {t("ecommerce.category.loadingProducts")}
          </Typography>
        )}
        {!productsLoading && (data?.items || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
            {t("store.noProducts")}
          </Typography>
        )}
        {(data?.items || []).map((product) => (
          <ProductCard key={product.id} product={product} wishlisted={wishlistedIds.has(product.id)} />
        ))}
      </Box>
    </Box>
  );
}
