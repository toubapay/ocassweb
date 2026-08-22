import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import {
  fetchAdminDeliveryPackageTypes,
  createAdminDeliveryPackageType,
  updateAdminDeliveryPackageType,
  deleteAdminDeliveryPackageType,
} from "../../api/admin";
import {
  DELIVERY_PACKAGE_TYPE_ICONS,
  DELIVERY_PACKAGE_TYPE_COLORS,
  packageTypeIconComponent,
  packageTypeColors,
} from "../../constants/deliveryPackageTypeOptions";

function IconTile({ icon, colorKey, size = 32 }) {
  const Icon = packageTypeIconComponent(icon);
  const { color, bg } = packageTypeColors(colorKey);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        bgcolor: bg,
        color,
      }}
    >
      <Icon fontSize="small" />
    </Box>
  );
}

function IconSelect({ value, onChange }) {
  return (
    <Select size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 130 }}>
      {Object.keys(DELIVERY_PACKAGE_TYPE_ICONS).map((name) => {
        const Icon = DELIVERY_PACKAGE_TYPE_ICONS[name];
        return (
          <MenuItem key={name} value={name}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Icon fontSize="small" />
              <Typography variant="body2">{name.replace("Rounded", "")}</Typography>
            </Box>
          </MenuItem>
        );
      })}
    </Select>
  );
}

function ColorSelect({ value, onChange }) {
  return (
    <Select size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 110 }}>
      {Object.keys(DELIVERY_PACKAGE_TYPE_COLORS).map((key) => (
        <MenuItem key={key} value={key}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                bgcolor: DELIVERY_PACKAGE_TYPE_COLORS[key].color,
              }}
            />
            <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
              {key}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}

function EditPackageTypeDialog({ packageType, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [labelEn, setLabelEn] = useState(packageType.labelEn);
  const [labelFr, setLabelFr] = useState(packageType.labelFr);
  const [hintEn, setHintEn] = useState(packageType.hintEn || "");
  const [hintFr, setHintFr] = useState(packageType.hintFr || "");
  const [icon, setIcon] = useState(packageType.icon);
  const [colorKey, setColorKey] = useState(packageType.colorKey);
  const [sortOrder, setSortOrder] = useState(packageType.sortOrder);

  const mutation = useMutation(
    () =>
      updateAdminDeliveryPackageType(packageType.id, {
        labelEn: labelEn.trim(),
        labelFr: labelFr.trim(),
        hintEn: hintEn.trim(),
        hintFr: hintFr.trim(),
        icon,
        colorKey,
        sortOrder: Number(sortOrder) || 0,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("admin-delivery-package-types");
        toast.success(t("admin.deliveryPackageTypes.updated"));
        onClose();
      },
      onError: (err) => toast.error(err.response?.data?.message || t("admin.deliveryPackageTypes.saveFailed")),
    }
  );

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.deliveryPackageTypes.editType")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          label={t("admin.deliveryPackageTypes.labelEn")}
          fullWidth
          value={labelEn}
          onChange={(e) => setLabelEn(e.target.value)}
        />
        <TextField
          label={t("admin.deliveryPackageTypes.labelFr")}
          fullWidth
          value={labelFr}
          onChange={(e) => setLabelFr(e.target.value)}
        />
        <TextField
          label={t("admin.deliveryPackageTypes.hintEn")}
          fullWidth
          value={hintEn}
          onChange={(e) => setHintEn(e.target.value)}
        />
        <TextField
          label={t("admin.deliveryPackageTypes.hintFr")}
          fullWidth
          value={hintFr}
          onChange={(e) => setHintFr(e.target.value)}
        />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <IconSelect value={icon} onChange={setIcon} />
          <ColorSelect value={colorKey} onChange={setColorKey} />
        </Box>
        <TextField
          label={t("admin.deliveryPackageTypes.sortOrder")}
          type="number"
          fullWidth
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
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

export default function AdminDeliveryPackageTypesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [labelEn, setLabelEn] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [icon, setIcon] = useState("Inventory2Rounded");
  const [colorKey, setColorKey] = useState("slate");
  const [editingType, setEditingType] = useState(null);

  const { data: packageTypes, isLoading } = useQuery(
    "admin-delivery-package-types",
    fetchAdminDeliveryPackageTypes
  );

  const createMutation = useMutation(createAdminDeliveryPackageType, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-delivery-package-types");
      toast.success(t("admin.deliveryPackageTypes.created"));
      setLabelEn("");
      setLabelFr("");
      setIcon("Inventory2Rounded");
      setColorKey("slate");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.deliveryPackageTypes.saveFailed")),
  });

  const toggleMutation = useMutation(
    ({ id, isActive }) => updateAdminDeliveryPackageType(id, { isActive }),
    { onSuccess: () => queryClient.invalidateQueries("admin-delivery-package-types") }
  );

  const deleteMutation = useMutation((id) => deleteAdminDeliveryPackageType(id), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-delivery-package-types");
      toast.success(t("admin.deliveryPackageTypes.deleted"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.deliveryPackageTypes.deleteFailed")),
  });

  const handleCreate = () => {
    if (!labelEn.trim() || !labelFr.trim()) {
      toast.error(t("admin.deliveryPackageTypes.labelsRequired"));
      return;
    }
    createMutation.mutate({
      labelEn: labelEn.trim(),
      labelFr: labelFr.trim(),
      icon,
      colorKey,
      sortOrder: (packageTypes || []).length,
    });
  };

  const handleDelete = (pt) => {
    if (!window.confirm(t("admin.deliveryPackageTypes.confirmDelete", { name: pt.labelEn }))) return;
    deleteMutation.mutate(pt.id);
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.deliveryPackageTypes.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("admin.deliveryPackageTypes.subtitle")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 3 }}>
        <TextField
          size="small"
          label={t("admin.deliveryPackageTypes.labelEn")}
          value={labelEn}
          onChange={(e) => setLabelEn(e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          label={t("admin.deliveryPackageTypes.labelFr")}
          value={labelFr}
          onChange={(e) => setLabelFr(e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <IconSelect value={icon} onChange={setIcon} />
        <ColorSelect value={colorKey} onChange={setColorKey} />
        <Button variant="contained" disabled={createMutation.isLoading} onClick={handleCreate}>
          {t("admin.deliveryPackageTypes.add")}
        </Button>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (packageTypes || []).map((pt) => (
          <Box
            key={pt.id}
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
              opacity: pt.isActive ? 1 : 0.55,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <IconTile icon={pt.icon} colorKey={pt.colorKey} />
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {pt.labelEn} <span style={{ fontWeight: 400 }}>/ {pt.labelFr}</span>
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {pt.key}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton size="small" onClick={() => setEditingType(pt)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={deleteMutation.isLoading} onClick={() => handleDelete(pt)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
              <Switch
                checked={pt.isActive}
                onChange={(e) => toggleMutation.mutate({ id: pt.id, isActive: e.target.checked })}
              />
            </Box>
          </Box>
        ))
      )}

      {editingType && <EditPackageTypeDialog packageType={editingType} onClose={() => setEditingType(null)} />}
    </Box>
  );
}
