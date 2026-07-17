import { useRouter } from "next/router";
import { useQuery } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Rating from "@mui/material/Rating";
import TopBar from "../../src/components/layout/TopBar";
import { fetchRestaurant } from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

export default function RestaurantDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { data: restaurant, isLoading } = useQuery(
    ["restaurant", slug],
    () => fetchRestaurant(slug),
    { enabled: Boolean(slug) }
  );

  if (isLoading || !restaurant) {
    return (
      <Box>
        <TopBar title="Restaurant" showCart={false} />
        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={restaurant.name} showCart={false} showSearch={false} />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {restaurant.cuisine} · {restaurant.address}
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <Rating value={restaurant.rating} precision={0.1} size="small" readOnly />
        </Box>
      </Box>

      <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(restaurant.menuItems || []).map((item) => (
          <Box
            key={item.id}
            sx={{ display: "flex", gap: 1.5, alignItems: "center", border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}
          >
            <Box component="img" src={item.imageUrl} sx={{ width: 56, height: 56, borderRadius: 2, objectFit: "cover" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {item.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {formatCfa(item.price)}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => toast("Restaurant ordering is coming soon")}
              sx={{ fontWeight: 800 }}
            >
              ADD
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
