import { createTheme } from "@mui/material/styles";

// Ocass brand green, matched from the reference app screenshots.
const brand = {
  green: "#0FAE58",
  greenDark: "#0B8A45",
  greenSoft: "#E7F7EE",
  amber: "#FFB020",
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: brand.green,
      dark: brand.greenDark,
      light: brand.greenSoft,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: brand.amber,
      contrastText: "#1A1A1A",
    },
    background: {
      default: "#FAFAFA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#6B7280",
    },
    error: { main: "#E5484D" },
    success: { main: brand.green },
    divider: "#EEEEEE",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),
    button: { textTransform: "none", fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, boxShadow: "none" },
        contained: { boxShadow: "none" },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #EEEEEE",
          boxShadow: "none",
        },
      },
    },
  },
});

export default theme;
export { brand };
