import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export default function CategorySidebar({ items, activeSlug, onSelect }) {
  return (
    <Box
      sx={{
        width: 92,
        flexShrink: 0,
        borderRight: "1px solid #EEEEEE",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 2.5,
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          bgcolor: "primary.light",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
        }}
      >
        <StorefrontRoundedIcon sx={{ color: "primary.main" }} fontSize="small" />
      </Box>

      {items.map((item) => {
        const active = item.slug === activeSlug;
        return (
          <Box
            key={item.slug}
            onClick={() => onSelect(item.slug)}
            sx={{
              width: "100%",
              textAlign: "center",
              py: 1.25,
              px: 0.5,
              cursor: "pointer",
              borderBottom: active ? "2.5px solid" : "2.5px solid transparent",
              borderColor: active ? "primary.main" : "transparent",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: active ? 800 : 500,
                color: active ? "primary.main" : "text.primary",
                lineHeight: 1.3,
                display: "block",
              }}
            >
              {item.name}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
