import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function ModuleTile({ module, size = 92 }) {
  const Icon = module.icon;
  return (
    <Link href={module.href} style={{ textDecoration: "none" }}>
      <Box sx={{ width: size, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Box
            sx={{
              width: size - 16,
              height: size - 16,
              borderRadius: "50%",
              bgcolor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            }}
          >
            <Icon sx={{ color: module.color, fontSize: size * 0.36 }} />
          </Box>

          <Box
            sx={{
              position: "absolute",
              bottom: -13,
              left: "50%",
              transform: "translateX(-50%)",
              bgcolor: "#FFFFFF",
              borderRadius: 999,
              px: 1.5,
              py: 0.4,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#1A1A1A", fontSize: 11.5 }}>
              {module.label}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Link>
  );
}
