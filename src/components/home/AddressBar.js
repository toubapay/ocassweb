import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

export default function AddressBar({ address = "Set your delivery address" }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        bgcolor: "rgba(255,255,255,0.18)",
        color: "#FFFFFF",
        borderRadius: 999,
        px: 2,
        py: 0.75,
        cursor: "pointer",
      }}
    >
      <HomeRoundedIcon fontSize="small" />
      <Typography variant="body2" sx={{ fontWeight: 700, maxWidth: 220 }} noWrap>
        {address}
      </Typography>
      <KeyboardArrowDownRoundedIcon fontSize="small" />
    </Box>
  );
}
