import Box from "@mui/material/Box";
import ProductCard from "./ProductCard";

/**
 * Horizontal-scrolling row of ProductCards - the "Ventes flash" /
 * per-category carousel pattern used throughout Jumia's home page
 * (and most multi-vendor marketplace home pages generally), as opposed
 * to this app's other product grids (2-column, full width).
 */
export default function ProductRow({ products, wishlistedIds }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.25,
        overflowX: "auto",
        px: 2,
        pb: 0.5,
        // Hide the scrollbar but keep it scrollable (touch/trackpad) -
        // matches the app's other horizontal lists (e.g. CategorySidebar).
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {products.map((product) => (
        <Box key={product.id} sx={{ flex: "0 0 148px", width: 148 }}>
          <ProductCard product={product} wishlisted={wishlistedIds?.has(product.id)} />
        </Box>
      ))}
    </Box>
  );
}
