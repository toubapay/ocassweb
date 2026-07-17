import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function ModuleTile({ module }) {
  const Icon = module.icon;
  return (
    <Link href={module.href} style={{ textDecoration: "none" }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              bgcolor: module.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon sx={{ color: module.color, fontSize: 24 }} />
          </Box>
        </Box>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: "#1A1A1A", textAlign: "center", lineHeight: 1.2 }}
        >
          {module.label}
        </Typography>
      </Box>
    </Link>
  );
}
