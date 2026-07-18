import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Avatar from "@mui/material/Avatar";
import Rating from "@mui/material/Rating";
import TopBar from "../../src/components/layout/TopBar";
import CategorySidebar from "../../src/components/ecommerce/CategorySidebar";
import ProductCard from "../../src/components/ecommerce/ProductCard";
import { fetchCategories, fetchProducts, fetchWishlist } from "../../src/api/ecommerce";
import useAuth from "../../src/hooks/useAuth";

export default function CategoryBrowse() {
  const router = useRouter();
  const { t } = useTranslation();
  const { categorySlug } = router.query;
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState(0);
  const [activeSlug, setActiveSlug] = useState("all");

  const { data: categories } = useQuery("categories", fetchCategories);
  const current = useMemo(
    () => (categories || []).find((c) => c.slug === categorySlug),
    [categories, categorySlug]
  );

  const filterSlug = activeSlug === "all" ? categorySlug : activeSlug;

  const { data, isLoading } = useQuery(
    ["products", filterSlug],
    () => fetchProducts({ category: filterSlug, pageSize: 40 }),
    { enabled: Boolean(filterSlug) }
  );

  const { data: wishlist } = useQuery("wishlist", fetchWishlist, { enabled: isAuthenticated });
  const wishlistedIds = new Set((wishlist || []).map((w) => w.productId));

  const stores = useMemo(() => {
    const map = new Map();
    (data?.items || []).forEach((p) => {
      if (p.store && !map.has(p.store.id)) map.set(p.store.id, p.store);
    });
    return Array.from(map.values());
  }, [data]);

  const sidebarItems = [
    { slug: "all", name: t("ecommerce.category.all") },
    ...((current?.children?.length ? current.children : [current]).filter(Boolean) || []).map(
      (c) => ({ slug: c.slug, name: c.name })
    ),
  ];

  return (
    <Box>
      <TopBar title={current?.name || t("ecommerce.category.title")} />

      <Box sx={{ px: 2, pt: 1.5 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, fontWeight: 700 } }}
        >
          <Tab label={t("ecommerce.category.articleTab")} sx={{ textTransform: "none" }} />
          <Tab label={t("ecommerce.category.storesTab")} sx={{ textTransform: "none" }} />
        </Tabs>
      </Box>

      <Box sx={{ display: "flex" }}>
        <CategorySidebar items={sidebarItems} activeSlug={activeSlug} onSelect={setActiveSlug} />

        <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
              {isLoading && (
                <Typography variant="body2" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
                  {t("ecommerce.category.loadingProducts")}
                </Typography>
              )}
              {!isLoading && (data?.items || []).length === 0 && (
                <Typography variant="body2" sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>
                  {t("ecommerce.category.noProducts")}
                </Typography>
              )}
              {(data?.items || []).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  wishlisted={wishlistedIds.has(product.id)}
                />
              ))}
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {stores.length === 0 && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {t("ecommerce.category.noStores")}
                </Typography>
              )}
              {stores.map((store) => (
                <Box
                  key={store.id}
                  onClick={() => router.push(`/ecommerce/${categorySlug}?store=${store.slug}`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    border: "1px solid #EEEEEE",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  <Avatar src={store.logoUrl} sx={{ width: 48, height: 48 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {store.name}
                    </Typography>
                    <Rating value={store.rating} precision={0.1} size="small" readOnly />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
