import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Autocomplete from "@mui/material/Autocomplete";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import {
  fetchAdminFlashSales,
  createAdminFlashSale,
  updateAdminFlashSale,
  deleteAdminFlashSale,
} from "../../api/admin";
import { fetchProducts } from "../../api/ecommerce";

const DAY_OF_WEEK_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const emptyForm = () => ({
  title: "",
  selectionMode: "AUTO",
  recurrenceType: "DAILY",
  startTime: "00:00",
  endTime: "23:59",
  dayOfWeek: 1,
  dayOfMonth: 1,
  onHomeScreen: false,
  onEcommerceHome: true,
  isActive: true,
});

function formToPayload(form, selectedProducts) {
  return {
    title: form.title.trim(),
    selectionMode: form.selectionMode,
    recurrenceType: form.recurrenceType,
    startTime: form.startTime,
    endTime: form.endTime,
    dayOfWeek: form.recurrenceType === "WEEKLY" ? Number(form.dayOfWeek) : null,
    dayOfMonth: form.recurrenceType === "MONTHLY" ? Number(form.dayOfMonth) : null,
    onHomeScreen: form.onHomeScreen,
    onEcommerceHome: form.onEcommerceHome,
    isActive: form.isActive,
    productIds: form.selectionMode === "MANUAL" ? selectedProducts.map((p) => p.id) : [],
  };
}

/**
 * The schedule + placement + product-source fields shared by the create
 * block and the edit dialog below - kept as one component so the two
 * forms can't silently drift apart.
 */
function FlashSaleFields({ form, setForm, selectedProducts, setSelectedProducts }) {
  const { t } = useTranslation();
  const [productSearch, setProductSearch] = useState("");
  const { data: productResults, isFetching: productsLoading } = useQuery(
    ["admin-flash-sale-product-search", productSearch],
    () => fetchProducts({ search: productSearch, pageSize: 10 }),
    { enabled: form.selectionMode === "MANUAL" && productSearch.trim().length > 1 }
  );

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label={t("admin.flashSales.name")}
        value={form.title}
        onChange={(e) => set("title")(e.target.value)}
        fullWidth
      />

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t("admin.flashSales.recurrence")}</InputLabel>
          <Select
            label={t("admin.flashSales.recurrence")}
            value={form.recurrenceType}
            onChange={(e) => set("recurrenceType")(e.target.value)}
          >
            <MenuItem value="DAILY">{t("admin.flashSales.recurrenceDaily")}</MenuItem>
            <MenuItem value="WEEKLY">{t("admin.flashSales.recurrenceWeekly")}</MenuItem>
            <MenuItem value="MONTHLY">{t("admin.flashSales.recurrenceMonthly")}</MenuItem>
          </Select>
        </FormControl>

        {form.recurrenceType === "WEEKLY" && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t("admin.flashSales.dayOfWeek")}</InputLabel>
            <Select
              label={t("admin.flashSales.dayOfWeek")}
              value={form.dayOfWeek}
              onChange={(e) => set("dayOfWeek")(e.target.value)}
            >
              {DAY_OF_WEEK_KEYS.map((key, i) => (
                <MenuItem key={key} value={i}>
                  {t(`admin.flashSales.days.${key}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {form.recurrenceType === "MONTHLY" && (
          <TextField
            size="small"
            type="number"
            label={t("admin.flashSales.dayOfMonth")}
            value={form.dayOfMonth}
            onChange={(e) => set("dayOfMonth")(e.target.value)}
            inputProps={{ min: 1, max: 31 }}
            sx={{ width: 140 }}
          />
        )}

        <TextField
          size="small"
          type="time"
          label={t("admin.flashSales.startTime")}
          value={form.startTime}
          onChange={(e) => set("startTime")(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 140 }}
        />
        <TextField
          size="small"
          type="time"
          label={t("admin.flashSales.endTime")}
          value={form.endTime}
          onChange={(e) => set("endTime")(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 140 }}
        />
      </Box>

      <FormControl size="small" sx={{ maxWidth: 260 }}>
        <InputLabel>{t("admin.flashSales.selectionMode")}</InputLabel>
        <Select
          label={t("admin.flashSales.selectionMode")}
          value={form.selectionMode}
          onChange={(e) => set("selectionMode")(e.target.value)}
        >
          <MenuItem value="AUTO">{t("admin.flashSales.selectionModeAuto")}</MenuItem>
          <MenuItem value="MANUAL">{t("admin.flashSales.selectionModeManual")}</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="caption" sx={{ color: "text.secondary", mt: -1.5 }}>
        {form.selectionMode === "AUTO"
          ? t("admin.flashSales.selectionModeAutoHelp")
          : t("admin.flashSales.selectionModeManualHelp")}
      </Typography>

      {form.selectionMode === "MANUAL" && (
        <Autocomplete
          multiple
          value={selectedProducts}
          onChange={(e, value) => setSelectedProducts(value)}
          inputValue={productSearch}
          onInputChange={(e, value) => setProductSearch(value)}
          options={productResults?.items || []}
          loading={productsLoading}
          getOptionLabel={(p) => p.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(x) => x}
          renderInput={(params) => (
            <TextField {...params} label={t("admin.flashSales.pickProducts")} placeholder={t("admin.flashSales.pickProductsPlaceholder")} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option.name} size="small" {...getTagProps({ index })} key={option.id} />
            ))
          }
        />
      )}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <FormControlLabel
          control={
            <Checkbox checked={form.onHomeScreen} onChange={(e) => set("onHomeScreen")(e.target.checked)} />
          }
          label={t("admin.flashSales.onHomeScreen")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={form.onEcommerceHome}
              onChange={(e) => set("onEcommerceHome")(e.target.checked)}
            />
          }
          label={t("admin.flashSales.onEcommerceHome")}
        />
        <FormControlLabel
          control={<Switch checked={form.isActive} onChange={(e) => set("isActive")(e.target.checked)} />}
          label={t("admin.flashSales.active")}
        />
      </Box>
    </Box>
  );
}

function EditFlashSaleDialog({ flashSale, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: flashSale.title,
    selectionMode: flashSale.selectionMode,
    recurrenceType: flashSale.recurrenceType,
    startTime: flashSale.startTime,
    endTime: flashSale.endTime,
    dayOfWeek: flashSale.dayOfWeek ?? 1,
    dayOfMonth: flashSale.dayOfMonth ?? 1,
    onHomeScreen: flashSale.onHomeScreen,
    onEcommerceHome: flashSale.onEcommerceHome,
    isActive: flashSale.isActive,
  });
  const [selectedProducts, setSelectedProducts] = useState(flashSale.products || []);

  const mutation = useMutation(() => updateAdminFlashSale(flashSale.id, formToPayload(form, selectedProducts)), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-flash-sales");
      toast.success(t("admin.flashSales.updated"));
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.flashSales.saveFailed")),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.flashSales.editCampaign")}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <FlashSaleFields
          form={form}
          setForm={setForm}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" disabled={mutation.isLoading} onClick={() => mutation.mutate()}>
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminFlashSalesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [editingFlashSale, setEditingFlashSale] = useState(null);

  const { data: flashSales, isLoading } = useQuery("admin-flash-sales", fetchAdminFlashSales);

  const createMutation = useMutation(createAdminFlashSale, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-flash-sales");
      toast.success(t("admin.flashSales.created"));
      setForm(emptyForm());
      setSelectedProducts([]);
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.flashSales.saveFailed")),
  });

  const deleteMutation = useMutation(deleteAdminFlashSale, {
    onSuccess: () => queryClient.invalidateQueries("admin-flash-sales"),
  });

  const toggleMutation = useMutation(({ id, isActive }) => updateAdminFlashSale(id, { isActive }), {
    onSuccess: () => queryClient.invalidateQueries("admin-flash-sales"),
  });

  const handleCreate = () => {
    if (!form.title.trim()) {
      toast.error(t("admin.flashSales.nameRequired"));
      return;
    }
    if (form.endTime <= form.startTime) {
      toast.error(t("admin.flashSales.endAfterStart"));
      return;
    }
    createMutation.mutate(formToPayload(form, selectedProducts));
  };

  const recurrenceLabel = (fs) => {
    if (fs.recurrenceType === "WEEKLY") {
      return `${t("admin.flashSales.recurrenceWeekly")} · ${t(`admin.flashSales.days.${DAY_OF_WEEK_KEYS[fs.dayOfWeek]}`)}`;
    }
    if (fs.recurrenceType === "MONTHLY") {
      return `${t("admin.flashSales.recurrenceMonthly")} · ${t("admin.flashSales.dayOfMonthShort", { day: fs.dayOfMonth })}`;
    }
    return t("admin.flashSales.recurrenceDaily");
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.flashSales.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("admin.flashSales.subtitle")}
      </Typography>

      <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t("admin.flashSales.newCampaign")}
        </Typography>
        <FlashSaleFields
          form={form}
          setForm={setForm}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
        />
        <Button
          variant="contained"
          disabled={createMutation.isLoading}
          onClick={handleCreate}
          sx={{ mt: 2 }}
        >
          {t("admin.flashSales.add")}
        </Button>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (flashSales || []).map((fs) => (
          <Box
            key={fs.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 1,
              px: 2,
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              opacity: fs.isActive ? 1 : 0.55,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <BoltRoundedIcon sx={{ color: "#FACC15" }} />
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{fs.title}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {recurrenceLabel(fs)} · {fs.startTime}–{fs.endTime} ·{" "}
                  {fs.selectionMode === "MANUAL"
                    ? t("admin.flashSales.productCount", { count: fs.products?.length || 0 })
                    : t("admin.flashSales.selectionModeAuto")}
                  {fs.onHomeScreen ? ` · ${t("admin.flashSales.onHomeScreen")}` : ""}
                  {fs.onEcommerceHome ? ` · ${t("admin.flashSales.onEcommerceHome")}` : ""}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton size="small" onClick={() => setEditingFlashSale(fs)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => deleteMutation.mutate(fs.id)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
              <Switch
                checked={fs.isActive}
                onChange={(e) => toggleMutation.mutate({ id: fs.id, isActive: e.target.checked })}
              />
            </Box>
          </Box>
        ))
      )}

      {editingFlashSale && (
        <EditFlashSaleDialog flashSale={editingFlashSale} onClose={() => setEditingFlashSale(null)} />
      )}
    </Box>
  );
}
