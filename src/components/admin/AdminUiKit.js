import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Shared visual language for every admin tab's content - a white "surface"
// with a subtle border + shadow (instead of the old flat 1px-border boxes),
// and a matching table header style. Keeping this in one place means every
// tab that adopts it looks consistent without repeating the same sx object.
export const cardSx = {
  bgcolor: "background.paper",
  borderRadius: 3,
  border: "1px solid #ECEEF1",
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

export const tableHeadRowSx = {
  "& th": {
    bgcolor: "#FAFBFC",
    fontWeight: 700,
    fontSize: 12.5,
    color: "text.secondary",
    borderBottom: "1px solid #ECEEF1",
  },
};

export const tableRowHoverSx = {
  "&:hover": { bgcolor: "#FAFBFC" },
  "& td": { borderColor: "#F1F2F5" },
};

/** A card-style surface - the base wrapper used across every admin tab. */
export function AdminCard({ sx, children, ...props }) {
  return (
    <Box sx={{ ...cardSx, ...sx }} {...props}>
      {children}
    </Box>
  );
}

/** A section title + subtitle pair, consistently spaced above a card. */
export function AdminSectionHeading({ title, subtitle, sx }) {
  return (
    <Box sx={{ mb: 2, ...sx }}>
      {title && (
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: subtitle ? 0.5 : 0 }}>{title}</Typography>
      )}
      {subtitle && (
        <Typography sx={{ color: "text.secondary", fontSize: 13.5 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}
