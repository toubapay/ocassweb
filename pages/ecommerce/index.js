import { useMemo } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import TopBar from "../../src/components/layout/TopBar";
import HeroBanner from "../../src/components/ecommerce/HeroBanner";
import ProductRow from "../../src/components/ecommerce/ProductRow";
import FlashSaleCountdown from "../../src/components/ecommerce/FlashSaleCountdown";
import { fetchCategories, fetchProducts, fetchWishlist, fetchActiveFlashSale } from "../../src/api/ecommerce";
import useAuth from "../../src/hooks/useAuth";

const CATEGORY_COLORS = ["#0FAE58", "#3B82F6", "#F97316", "#8B5CF6", "#E5484D", "#0D9488"];

/**
 * Themed horizontal band (colored header + "Voir plus" + product row) -
 * the repeating per-category home-page pattern Jumia and most
 * multi-vendor marketplaces use ("Produits Bébé", "SMART TECHNOLOGY",
 * "Mode Femme" in their screenshots). One of these per top-level
 * category, each fetching just that category's products.
 */
function CategorySection({ category, color, wishlistedIds }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(
    ["products", "home-category", category.slug],
    () => fetchProducts({ category: category.slug, pageSize: 10 }),
    { enabled: Boolean(category.slug) }
  );

  const products = data?.items || [];
  if (!isLoading && products.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          bgcolor: color,
          color: "#fff",
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => router.push(`/ecommerce/${category.slug}`)}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {t(`categories.${category.slug}`, { defaultValue: category.name })}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {t("ecommerce.home.bestOffers")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t("ecommerce.home.seeMore")}
          </Typography>
          <ChevronRightRoundedIcon fontSize="small" />
        </Box>
      </Box>
      <Box sx={{ pt: 1.5 }}>
        {isLoading ? (
          <Typography variant="body2" sx={{ color: "text.secondary", px: 2 }}>
            {t("common.loading")}
          </Typography>
        ) : (
          <ProductRow products={products} wishlistedIds={wishlistedIds} />
        )}
      </Box>
    </Box>
  );
}

export default function EcommerceDiscover() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const { data: categories, isLoading: categoriesLoading } = useQuery("categories", fetchCategories);
  const { data: flashSale, isLoading: flashLoading } = useQuery(
    ["flash-sale", "ecommerce"],
    () => fetchActiveFlashSale("ecommerce"),
    // Re-checks periodically so the section appears/disappears on its own
    // as the admin-configured schedule window opens/closes, without
    // needing a page reload.
    { refetchInterval: 60000 }
  );
  const { data: wishlist } = useQuery("wishlist", fetchWishlist, { enabled: isAuthenticated });
  const wishlistedIds = useMemo(
    () => new Set((wishlist || []).map((w) => w.productId)),
    [wishlist]
  );

  const topCategories = categories || [];
  const flashProducts = flashSale?.products || [];

  return (
    <Box sx={{ pb: 3 }}>
      <TopBar title={t("ecommerce.discover.title")} showBack={false} />

      <HeroBanner t={t} />

      {/* Category quick-nav - jump straight into browsing without
          scrolling past every themed section below. */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          px: 2,
          pt: 2.5,
          pb: 0.5,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {categoriesLoading &&
          [...Array(4)].map((_, i) => (
            <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: "grey.100" }} />
            </Box>
          ))}
        {topCategories.map((cat, i) => (
          <Box
            key={cat.id}
            onClick={() => router.push(`/ecommerce/${cat.slug}`)}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            <Avatar
              src={cat.imageUrl || undefined}
              sx={{
                width: 56,
                height: 56,
                bgcolor: `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}22`,
                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                fontWeight: 800,
              }}
            >
              {(cat.name || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="caption" sx={{ fontWeight: 700, maxWidth: 64, textAlign: "center" }} noWrap>
              {t(`categories.${cat.slug}`, { defaultValue: cat.name })}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Flash sale - only rendered while an admin-configured FlashSale
          campaign (see AdminFlashSalesTab) is actually inside its
          recurring schedule window; hidden entirely otherwise, rather
          than showing a "starts in..." teaser. */}
      {(flashLoading || flashSale) && (
        <Box sx={{ mt: 2.5, mb: 2 }}>
          <Box
            sx={{
              bgcolor: "#1A1A1A",
              color: "#fff",
              px: 2,
              py: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <BoltRoundedIcon sx={{ color: "#FACC15" }} fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {flashSale ? flashSale.title : t("ecommerce.home.flashSale")}
              </Typography>
            </Box>
            {flashSale && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {t("ecommerce.home.endsIn")}
                </Typography>
                <FlashSaleCountdown endsAt={flashSale.endsAt} />
              </Box>
            )}
          </Box>
          <Box sx={{ pt: 1.5 }}>
            {flashLoading ? (
              <Typography variant="body2" sx={{ color: "text.secondary", px: 2 }}>
                {t("common.loading")}
              </Typography>
            ) : (
              <ProductRow products={flashProducts} wishlistedIds={wishlistedIds} />
            )}
          </Box>
        </Box>
      )}

      {topCategories.map((cat, i) => (
        <CategorySection
          key={cat.id}
          category={cat}
          color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
          wishlistedIds={wishlistedIds}
        />
      ))}
    </Box>
  );
}
