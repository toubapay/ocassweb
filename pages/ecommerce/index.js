import { useRouter } from "next/router";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TopBar from "../../src/components/layout/TopBar";
import { fetchCategories } from "../../src/api/ecommerce";

const ICON_BG = ["#E7F7EE", "#EAF2FE", "#FFF6E5", "#FDECEC", "#F2EEFE"];

export default function EcommerceDiscover() {
  const router = useRouter();
  const { data: categories, isLoading } = useQuery("categories", fetchCategories);

  return (
    <Box>
      <TopBar title="Shop" showBack={false} />
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          Browse categories
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {isLoading && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Loading...
            </Typography>
          )}
          {(categories || []).map((cat, i) => (
            <Paper
              key={cat.id}
              onClick={() => router.push(`/ecommerce/${cat.slug}`)}
              sx={{
                p: 2,
                borderRadius: 3,
                cursor: "pointer",
                bgcolor: ICON_BG[i % ICON_BG.length],
                border: "none",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minHeight: 90,
                justifyContent: "flex-end",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {cat.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {cat.children?.length ? `${cat.children.length} subcategories` : "Shop now"}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
