import Box from "@mui/material/Box";

export default function HeaderWave({ fill = "#FAFAFA" }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 414 48"
      preserveAspectRatio="none"
      sx={{ position: "absolute", bottom: -1, left: 0, width: "100%", height: 44, display: "block" }}
    >
      <path d="M0,22 C90,58 320,-8 414,24 L414,48 L0,48 Z" fill={fill} />
    </Box>
  );
}
