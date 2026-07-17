import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
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
import SortableModuleTile from "../src/components/home/SortableModuleTile";
import HeaderWave from "../src/components/home/HeaderWave";
import ShortcutCard from "../src/components/home/ShortcutCard";
import ProductCard from "../src/components/ecommerce/ProductCard";
import useAuth from "../src/hooks/useAuth";
import { fetchProducts, fetchCategories } from "../src/api/ecommerce";

const CATEGORY_ICONS = {
  footwear: { icon: CheckroomRoundedIcon, color: "#0FAE58", bg: "#E7F7EE" },
  electronics: { icon: DevicesOtherRoundedIcon, color: "#3B82F6", bg: "#EAF2FE" },
  groceries: { icon: LocalGroceryStoreRoundedIcon, color: "#FFB020", bg: "#FFF6E5" },
  beauty: { icon: SpaRoundedIcon, color: "#E5484D", bg: "#FDECEC" },
};
const DEFAULT_CATEGORY_ICON = { icon: StorefrontRoundedIcon, color: "#8B5CF6", bg: "#F2EEFE" };

export default function Home() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const savedOrder = useSelector((state) => state.layout.moduleOrder);
  const { data } = useQuery("home-products", () => fetchProducts({ pageSize: 6 }));
  const { data: categories } = useQuery("categories", fetchCategories);
  const firstName = user?.name?.split(" ")[0];

  const orderedModules = useMemo(() => getOrderedModules(savedOrder), [savedOrder]);
  const topRow = orderedModules.slice(0, 3);
  const bottomRow = orderedModules.slice(3);

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
        <AddressBar address="Plateau, Dakar" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedModules.map((m) => m.id)} strategy={rectSortingStrategy}>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2.5, mt: 4.5 }}>
              {topRow.map((module) => (
                <SortableModuleTile key={module.id} module={module} />
              ))}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2.5, mt: 4.5 }}>
              {bottomRow.map((module) => (
                <SortableModuleTile key={module.id} module={module} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mt: 2 }}>
          <DragIndicatorRoundedIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            Hold and drag an icon to rearrange
          </Typography>
        </Box>

        <HeaderWave />
      </Box>

      <Box sx={{ px: 2.5, pt: 3, pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 20 }}>
            {firstName ? `${firstName}, these are for you` : "Explore Ocass"}
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
              color={conf.color}
              bg={conf.bg}
              label={cat.name}
              href={`/ecommerce/${cat.slug}`}
            />
          );
        })}
      </Box>

      <Box sx={{ px: 2.5, pb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          Popular right now
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
          {(data?.items || []).map((product) => (
            <Box key={product.id} sx={{ minWidth: 150, maxWidth: 150 }}>
              <ProductCard product={product} />
            </Box>
          ))}
        </Box>
      </Box>

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
            Free delivery on your first order
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Offer applied automatically at checkout.
          </Typography>

          <Box
            sx={{
              position: "absolute",
              right: 18,
              top: "50%",
              transform: "translateY(-50%)",
              width: 68,
              height: 68,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(15,174,88,0.35)",
            }}
          >
            <CardGiftcardRoundedIcon sx={{ color: "#fff", fontSize: 32 }} />
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
    </Box>
  );
}
