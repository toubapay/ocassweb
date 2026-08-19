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
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
} from "../../api/admin";

function EditCategoryDialog({ category, topLevelCategories, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState(category.parentId || "");
  const [icon, setIcon] = useState(category.icon || "");

  const mutation = useMutation(
    () =>
      updateAdminCategory(category.id, {
        name: name.trim(),
        parentId: parentId || null,
        icon: icon.trim(),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("admin-categories");
        toast.success(t("admin.categories.updated"));
        onClose();
      },
      onError: (err) => toast.error(err.response?.data?.message || t("admin.categories.saveFailed")),
    }
  );

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.categories.editCategory")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField label={t("admin.categories.name")} fullWidth value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={parentId} onChange={(e) => setParentId(e.target.value)} displayEmpty fullWidth>
          <MenuItem value="">
            <em>{t("admin.categories.noParent")}</em>
          </MenuItem>
          {topLevelCategories
            .filter((c) => c.id !== category.id)
            .map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
        </Select>
        <TextField label={t("admin.categories.icon")} fullWidth value={icon} onChange={(e) => setIcon(e.target.value)} />
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

export default function AdminCategoriesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [icon, setIcon] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);

  const { data: categories, isLoading } = useQuery("admin-categories", fetchAdminCategories);
  const topLevelCategories = (categories || []).filter((c) => !c.parentId);

  const createMutation = useMutation(createAdminCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-categories");
      toast.success(t("admin.categories.created"));
      setName("");
      setParentId("");
      setIcon("");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.categories.saveFailed")),
  });

  const toggleMutation = useMutation(
    ({ id, isActive }) => updateAdminCategory(id, { isActive }),
    { onSuccess: () => queryClient.invalidateQueries("admin-categories") }
  );

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error(t("admin.categories.nameRequired"));
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      parentId: parentId || undefined,
      icon: icon.trim() || undefined,
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.categories.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("admin.categories.subtitle")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
        <TextField
          size="small"
          label={t("admin.categories.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <Select
          size="small"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          displayEmpty
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">
            <em>{t("admin.categories.noParent")}</em>
          </MenuItem>
          {topLevelCategories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
        <TextField
          size="small"
          label={t("admin.categories.icon")}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          sx={{ minWidth: 140 }}
        />
        <Button variant="contained" disabled={createMutation.isLoading} onClick={handleCreate}>
          {t("admin.categories.add")}
        </Button>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (categories || []).map((c) => (
          <Box
            key={c.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 1,
              px: 2,
              mb: 1,
              ml: c.parentId ? 3 : 0,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              opacity: c.isActive ? 1 : 0.55,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {c.parentId ? `— ${c.name}` : c.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {c.slug} · {t("admin.categories.productCount", { count: c._count?.products || 0 })}
                {c.parent ? ` · ${t("admin.categories.under", { name: c.parent.name })}` : ""}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton size="small" onClick={() => setEditingCategory(c)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
              <Switch
                checked={c.isActive}
                onChange={(e) => toggleMutation.mutate({ id: c.id, isActive: e.target.checked })}
              />
            </Box>
          </Box>
        ))
      )}

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          topLevelCategories={topLevelCategories}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </Box>
  );
}
