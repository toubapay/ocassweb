import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Avatar from "@mui/material/Avatar";
import CheckroomRoundedIcon from "@mui/icons-material/CheckroomRounded";
import DevicesOtherRoundedIcon from "@mui/icons-material/DevicesOtherRounded";
import LocalGroceryStoreRoundedIcon from "@mui/icons-material/LocalGroceryStoreRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import { useQuery } from "react-query";
import { useDispatch, useSelector } from "react-redux";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { getOrderedModules } from "../src/constants/modules";
import { setModuleOrder } from "../src/redux/slices/layoutSlice";
import AddressBar from "../src/components/home/AddressBar";
import DeliveryAddressDialog from "../src/components/home/DeliveryAddressDialog";
import SortableModuleTile from "../src/components/home/SortableModuleTile";
import HeaderWave from "../src/components/home/HeaderWave";
import ShortcutCard from "../src/components/home/ShortcutCard";
import ProductCard from "../src/components/ecommerce/ProductCard";
import FlashSaleCountdown from "../src/components/ecommerce/FlashSaleCountdown";
import useAuth from "../src/hooks/useAuth";
import { fetchProducts, fetchCategories, fetchActiveFlashSale } from "../src/api/ecommerce";
import { fetchStores } from "../src/api/vendor";
import { fetchUnreadCount } from "../src/api/notifications";

const CATEGORY_ICONS = {
  footwear: { icon: CheckroomRoundedIcon, color: "#0FAE58", bg: "#E7F7EE" },
  electronics: { icon: DevicesOtherRoundedIcon, color: "#3B82F6", bg: "#EAF2FE" },
  groceries: { icon: LocalGroceryStoreRoundedIcon, color: "#FFB020", bg: "#FFF6E5" },
  beauty: { icon: SpaRoundedIcon, color: "#E5484D", bg: "#FDECEC" },
};
const DEFAULT_CATEGORY_ICON = { icon: StorefrontRoundedIcon, color: "#8B5CF6", bg: "#F2EEFE" };

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const savedOrder = useSelector((state) => state.layout.moduleOrder);
  const deliveryAddress = useSelector((state) => state.location.address);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const { data } = useQuery("home-products", () => fetchProducts({ pageSize: 6 }));
  const { data: categories } = useQuery("categories", fetchCategories);
  const { data: flashSale } = useQuery(
    ["flash-sale", "home"],
    () => fetchActiveFlashSale("home"),
    { refetchInterval: 60000 }
  );
  const { data: featuredStores } = useQuery("featured-stores", () => fetchStores({ featured: true }));
  const { data: unreadCount } = useQuery("notifications-unread-count", fetchUnreadCount, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const firstName = user?.name?.split(" ")[0];

  const orderedModules = useMemo(() => getOrderedModules(savedOrder), [savedOrder]);
  // A fixed 4-column grid (rather than two hardcoded 3/4 row slices) scales
  // to any module count without re-tuning the split by hand; the tile size
  // shrinks a touch once there are more than 6 so four still fit per row on
  // narrow phones without overflowing the 480px mobile frame.
  const tileSize = orderedModules.length > 6 ? 80 : 97;

  // Delay-based activation (long-press) rather than distance-based: dnd-kit's
  // distance constraint calls preventDefault() on pointerdown immediately,
  // which suppresses the click a plain tap needs to navigate. A delay only
  // arms the drag if the pointer is held past the threshold, so quick taps
  // reach the module's Link untouched.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = orderedModules.map((m) => m.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    dispatch(setModuleOrder(arrayMove(ids, oldIndex, newIndex)));
  };

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          background: "linear-gradient(180deg, #0FAE58 0%, #0B8A45 100%)",
          pt: 3,
          pb: 6,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <AddressBar address={deliveryAddress} onClick={() => setAddressDialogOpen(true)} />
          {isAuthenticated && (
            <IconButton
              onClick={() => router.push("/notifications")}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.18)" }}
            >
              <Badge badgeContent={unreadCount || 0} color="error">
                <NotificationsRoundedIcon />
              </Badge>
            </IconButton>
          )}
        </Box>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedModules.map((m) => m.id)} strategy={rectSortingStrategy}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                justifyItems: "center",
                rowGap: 4.5,
                columnGap: 1,
                mt: 4.5,
              }}
            >
              {orderedModules.map((module) => (
                <SortableModuleTile key={module.id} module={module} size={tileSize} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mt: 2 }}>
          <DragIndicatorRoundedIcon sx={{ fontSize: 15, color: "rgba(255,255,255,0.75)" }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            {t("home.dragHint")}
          </Typography>
        </Box>

        <HeaderWave />
      </Box>

      <Box sx={{ px: 2.5, pt: 3, pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 21 }}>
            {firstName ? t("home.greeting", { name: firstName }) : t("home.exploreOcass")}
          </Typography>
          <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
        </Box>
      </Box>

      <Box sx={{ px: 2.5, pb: 3, display: "flex", gap: 1.5, overflowX: "auto" }}>
        {(categories || []).map((cat) => {
          const conf = CATEGORY_ICONS[cat.slug] || DEFAULT_CATEGORY_ICON;
          return (
            <ShortcutCard
              key={cat.id}
              icon={conf.icon}
              imageUrl={cat.imageUrl}
              color={conf.color}
              bg={conf.bg}
              label={t(`categories.${cat.slug}`, { defaultValue: cat.name })}
              href={`/ecommerce/${cat.slug}`}
            />
          );
        })}
      </Box>

      <Box sx={{ px: 2.5, pb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          {t("home.popularRightNow")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
          {(data?.items || []).map((product) => (
            <Box key={product.id} sx={{ minWidth: 150, maxWidth: 150 }}>
              <ProductCard product={product} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Flash sale - only rendered while an admin-configured FlashSale
          campaign (see AdminFlashSalesTab) targeting the main Home Screen
          is inside its recurring schedule window. Same campaigns/API as
          the ecommerce discover page's own flash section (placement
          differs), so a campaign can appear on either, both, or neither. */}
      {flashSale && (
        <Box sx={{ px: 2.5, pb: 3 }}>
          <Box sx={{ borderRadius: 3, overflow: "hidden" }}>
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
                  {flashSale.title}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {t("ecommerce.home.endsIn")}
                </Typography>
                <FlashSaleCountdown endsAt={flashSale.endsAt} />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pt: 1.5, pb: 1 }}>
              {flashSale.products.map((product) => (
                <Box key={product.id} sx={{ minWidth: 150, maxWidth: 150 }}>
                  <ProductCard product={product} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Admin-curated stores (see AdminVendorsTab.js's "Featured"
          toggle) - independent of any module, spotlighting whole
          storefronts rather than individual products. */}
      {featuredStores && featuredStores.length > 0 && (
        <Box sx={{ px: 2.5, pb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            {t("home.featuredShops")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
            {featuredStores.map((store) => (
              <Box
                key={store.id}
                onClick={() => router.push(`/store/${store.slug}`)}
                sx={{
                  minWidth: 108,
                  maxWidth: 108,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                }}
              >
                <Avatar
                  src={store.logoUrl || undefined}
                  variant="rounded"
                  sx={{ width: 88, height: 88, borderRadius: 3.5, bgcolor: "#F2EEFE", color: "#8B5CF6" }}
                >
                  <StorefrontRoundedIcon sx={{ fontSize: 34 }} />
                </Avatar>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}
                  noWrap
                >
                  {store.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <StarRoundedIcon sx={{ fontSize: 14, color: "#FFB020" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {store.rating.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ px: 2.5, pb: 3 }}>
        <Box
          sx={{
            position: "relative",
            background: "linear-gradient(135deg, #E7F7EE 0%, #FFF6E5 100%)",
            borderRadius: 4,
            p: 2.5,
            pr: 11,
            overflow: "visible",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("home.freeDeliveryTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("home.freeDeliverySubtitle")}
          </Typography>

          <Box
            sx={{
              position: "absolute",
              right: 18,
              top: "50%",
              transform: "translateY(-50%)",
              width: 71,
              height: 71,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(15,174,88,0.35)",
            }}
          >
            <CardGiftcardRoundedIcon sx={{ color: "#fff", fontSize: 34 }} />
          </Box>

          <IconButton
            size="small"
            sx={{
              position: "absolute",
              bottom: 10,
              right: 10,
              bgcolor: "#fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            <ArrowForwardRoundedIcon fontSize="small" sx={{ color: "primary.main" }} />
          </IconButton>
        </Box>
      </Box>

      <DeliveryAddressDialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} />
    </Box>
  );
}
