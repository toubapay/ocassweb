import { useRouter } from "next/router";
import { useQuery } from "react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Rating from "@mui/material/Rating";
import Avatar from "@mui/material/Avatar";
import TopBar from "../../src/components/layout/TopBar";
import { fetchRestaurants } from "../../src/api/modules";

export default function RestaurantList() {
  const router = useRouter();
  const { data: restaurants, isLoading } = useQuery("restaurants", () => fetchRestaurants());

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title="Restaurants" showBack={false} showCart={false} />
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Loading restaurants...
          </Typography>
        )}
        {(restaurants || []).map((restaurant) => (
          <Box
            key={restaurant.id}
            onClick={() => router.push(`/restaurant/${restaurant.slug}`)}
            sx={{
              display: "flex",
              gap: 1.5,
              alignItems: "center",
              border: "1px solid #EEEEEE",
              borderRadius: 3,
              p: 1.5,
              cursor: "pointer",
            }}
          >
            <Avatar src={restaurant.logoUrl} sx={{ width: 56, height: 56 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                {restaurant.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {restaurant.cuisine}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                <Rating value={restaurant.rating} precision={0.1} size="small" readOnly />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
