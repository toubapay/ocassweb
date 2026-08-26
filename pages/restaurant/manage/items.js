import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import TopBar from "../../../src/components/layout/TopBar";
import useAuth from "../../../src/hooks/useAuth";
import {
  fetchMyMenuItems,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
} from "../../../src/api/restaurantOwner";
import { formatCfa } from "../../../src/utils/currency";

const emptyForm = { name: "", description: "", price: "", imageUrl: "", category: "" };

export default function RestaurantMenuItems() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = isAuthenticated && Boolean(user?.restaurant);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: menuItems, isLoading } = useQuery("restaurant-menu-items", fetchMyMenuItems, {
    enabled: isOwner,
  });

  const invalidate = () => queryClient.invalidateQueries("restaurant-menu-items");

  const createMutation = useMutation((payload) => createMenuItem(payload), {
    onSuccess: () => {
      toast.success(t("restaurant.manage.itemCreated"));
      invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("restaurant.manage.couldNotSaveItem")),
  });

  const updateMutation = useMutation(({ id, payload }) => updateMenuItem(id, payload), {
    onSuccess: () => {
      toast.success(t("restaurant.manage.itemUpdated"));
      invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("restaurant.manage.couldNotSaveItem")),
  });

  const deactivateMutation = useMutation((id) => deactivateMenuItem(id), {
    onSuccess: () => {
      toast.success(t("restaurant.manage.itemDeactivated"));
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("restaurant.manage.couldNotSaveItem")),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      imageUrl: item.imageUrl || "",
      category: item.category || "",
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) {
      toast.error(t("restaurant.manage.fillRequiredFields"));
      return;
    }
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      imageUrl: form.imageUrl || undefined,
      category: form.category || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAuthenticated || !isOwner) {
    return (
      <Box>
        <TopBar title={t("restaurant.manage.menuItems")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Button variant="contained" onClick={() => router.push(isAuthenticated ? "/profile" : "/auth/login")}>
            {isAuthenticated ? t("nav.profile") : t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  const saving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Box sx={{ pb: 10, position: "relative", minHeight: "100vh" }}>
      <TopBar title={t("restaurant.manage.menuItems")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("common.loading")}
          </Typography>
        )}
        {!isLoading && (menuItems || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
            {t("restaurant.manage.noItems")}
          </Typography>
        )}
        {(menuItems || []).map((item) => (
          <Box
            key={item.id}
            sx={{
              border: "1px solid #EEEEEE",
              borderRadius: 3,
              p: 1.5,
              opacity: item.isActive ? 1 : 0.55,
              display: "flex",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.name}
                </Typography>
                {!item.isActive && <Chip label={t("vendor.inactive")} size="small" />}
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {formatCfa(item.price)}
                </Typography>
                {item.category && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    · {item.category}
                  </Typography>
                )}
              </Box>
            </Box>
            <Button size="small" onClick={() => openEdit(item)} sx={{ minWidth: 0, p: 1 }}>
              <EditRoundedIcon fontSize="small" />
            </Button>
            {item.isActive && (
              <Button
                size="small"
                color="error"
                disabled={deactivateMutation.isLoading}
                onClick={() => deactivateMutation.mutate(item.id)}
                sx={{ minWidth: 0, p: 1 }}
              >
                <DeleteRoundedIcon fontSize="small" />
              </Button>
            )}
          </Box>
        ))}
      </Box>

      <Fab color="primary" onClick={openCreate} sx={{ position: "fixed", bottom: 24, right: 24 }}>
        <AddRoundedIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? t("restaurant.manage.editItem") : t("restaurant.manage.newItem")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={t("restaurant.manage.itemName")}
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label={t("restaurant.manage.itemDescription")}
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label={t("restaurant.manage.itemCategory")}
            fullWidth
            placeholder={t("restaurant.manage.itemCategoryPlaceholder")}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <TextField
            label={t("vendor.price")}
            type="number"
            fullWidth
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <TextField
            label={t("restaurant.manage.itemImageUrl")}
            fullWidth
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog}>{t("vendor.cancel")}</Button>
          <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ fontWeight: 700 }}>
            {saving ? t("vendor.saving") : t("vendor.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
