import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import Typography from "@mui/material/Typography";
import { setLanguage } from "../../redux/slices/i18nSlice";

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.i18n.language);

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <TranslateRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("common.language")}
        </Typography>
      </Box>
      <ToggleButtonGroup
        value={language}
        exclusive
        fullWidth
        size="small"
        onChange={(e, value) => {
          if (value) dispatch(setLanguage(value));
        }}
      >
        <ToggleButton value="fr" sx={{ fontWeight: 700, textTransform: "none" }}>
          {t("common.french")}
        </ToggleButton>
        <ToggleButton value="en" sx={{ fontWeight: 700, textTransform: "none" }}>
          {t("common.english")}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
