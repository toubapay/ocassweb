import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "react-query";
import { MODULES } from "../src/constants/modules";
import AddressBar from "../src/components/home/AddressBar";
import ModuleTile from "../src/components/home/ModuleTile";
import ProductCard from "../src/components/ecommerce/ProductCard";
import useAuth from "../src/hooks/useAuth";
import { fetchProducts } from "../src/api/ecommerce";

export default function Home() {
  const { user } = useAuth();
  const { data } = useQuery("home-products", () => fetchProducts({ pageSize: 6 }));

  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(180deg, #0FAE58 0%, #0B8A45 100%)",
          pt: 3,
          pb: 6,
          px: 2.5,
        }}
      >
        <AddressBar address="Plateau, Abidjan" />
        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 800, mt: 3 }}>
          {user?.name ? `Hi, ${user.name}` : "Welcome to Ocass"}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
          One app for shopping, food, delivery, rides & insurance
        </Typography>
      </Box>

      <Box sx={{ mt: -4, px: 2, pb: 3 }}>
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            p: 2.5,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            {MODULES.map((module) => (
              <Box key={module.id} sx={{ minWidth: 0, flex: "1 1 0" }}>
                <ModuleTile module={module} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 3 }}>
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

      <Box sx={{ px: 2, pb: 3 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #E7F7EE 0%, #FFF6E5 100%)",
            borderRadius: 3,
            p: 2.5,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Free delivery on your first order
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Offer applied automatically at checkout.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
