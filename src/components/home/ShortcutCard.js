import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function ShortcutCard({ icon: Icon, label, href, color = "#0FAE58", bg = "#E7F7EE" }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Box sx={{ width: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: 3.5,
            bgcolor: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ color, fontSize: 32 }} />
        </Box>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "#1A1A1A", textAlign: "center", lineHeight: 1.2 }}
          noWrap
        >
          {label}
        </Typography>
      </Box>
    </Link>
  );
}
