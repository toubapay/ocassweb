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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import Avatar from "@mui/material/Avatar";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchMyProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  createCategory,
} from "../../src/api/vendor";
import { fetchCategories } from "../../src/api/ecommerce";
import { formatCfa } from "../../src/utils/currency";

const emptyForm = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  stock: "",
  images: "",
};

const emptyCategoryForm = { name: "", parentId: "" };

function flattenCategories(categories) {
  const out = [];
  (categories || []).forEach((cat) => {
    out.push(cat);
    (cat.children || []).forEach((child) => out.push({ ...child, indent: true }));
  });
  return out;
}

export default function VendorProducts() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const isVendor = isAuthenticated && user?.role === "VENDOR";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const { data: products, isLoading } = useQuery("vendor-products", fetchMyProducts, {
    enabled: isVendor,
  });
  const { data: categories } = useQuery("categories", fetchCategories, { enabled: isVendor });
  const flatCategories = flattenCategories(categories);

  const invalidate = () => queryClient.invalidateQueries("vendor-products");

  const createCategoryMutation = useMutation(
    (payload) => createCategory(payload),
    {
      onSuccess: () => {
        toast.success(t("vendor.categoryCreated"));
        queryClient.invalidateQueries("categories");
        setCategoryForm(emptyCategoryForm);
      },
      onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveCategory")),
    }
  );

  const createMutation = useMutation((payload) => createProduct(payload), {
    onSuccess: () => {
      toast.success(t("vendor.productCreated"));
      invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveProduct")),
  });

  const updateMutation = useMutation(({ id, payload }) => updateProduct(id, payload), {
    onSuccess: () => {
      toast.success(t("vendor.productUpdated"));
      invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveProduct")),
  });

  const deactivateMutation = useMutation((id) => deactivateProduct(id), {
    onSuccess: () => {
      toast.success(t("vendor.productDeactivated"));
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("vendor.couldNotSaveProduct")),
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

  const openEdit = (product) => {
    setForm({
      categoryId: product.categoryId,
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      discountPrice: product.discountPrice ? String(product.discountPrice) : "",
      stock: String(product.stock),
      images: (product.images || []).join(", "),
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.categoryId || !form.price) {
      toast.error(t("vendor.fillRequiredFields"));
      return;
    }
    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      stock: Number(form.stock) || 0,
      images: form.images
        ? form.images.split(",").map((url) => url.trim()).filter(Boolean)
        : [],
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCreateCategory = () => {
    if (!categoryForm.name.trim()) {
      toast.error(t("vendor.categoryNameRequired"));
      return;
    }
    createCategoryMutation.mutate({
      name: categoryForm.name.trim(),
      parentId: categoryForm.parentId || undefined,
    });
  };

  if (!isAuthenticated || !isVendor) {
    return (
      <Box>
        <TopBar title={t("vendor.products")} showCart={false} showSearch={false} />
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
      <TopBar title={t("vendor.products")} showCart={false} showSearch={false} />

      <Box sx={{ px: 2, pt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="small"
          startIcon={<CategoryRoundedIcon fontSize="small" />}
          onClick={() => setCategoryDialogOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          {t("vendor.manageCategories")}
        </Button>
      </Box>

      <Box sx={{ p: 2, pt: 0.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("common.loading")}
          </Typography>
        )}
        {!isLoading && (products || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
            {t("vendor.noProducts")}
          </Typography>
        )}
        {(products || []).map((p) => (
          <Box
            key={p.id}
            sx={{
              border: "1px solid #EEEEEE",
              borderRadius: 3,
              p: 1.5,
              opacity: p.isActive ? 1 : 0.55,
              display: "flex",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Avatar
              variant="rounded"
              src={p.images?.[0]}
              sx={{ width: 48, height: 48, bgcolor: "grey.100", flexShrink: 0 }}
            >
              <CategoryRoundedIcon sx={{ color: "grey.400" }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {p.name}
                </Typography>
                {!p.isActive && <Chip label={t("vendor.inactive")} size="small" />}
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {formatCfa(p.discountPrice || p.price)}
                </Typography>
                {p.discountPrice && (
                  <Typography
                    variant="caption"
                    sx={{ color: "text.disabled", textDecoration: "line-through" }}
                  >
                    {formatCfa(p.price)}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  · {t("vendor.stockCount", { count: p.stock })}
                </Typography>
              </Box>
            </Box>
            <Button size="small" onClick={() => openEdit(p)} sx={{ minWidth: 0, p: 1 }}>
              <EditRoundedIcon fontSize="small" />
            </Button>
            {p.isActive && (
              <Button
                size="small"
                color="error"
                disabled={deactivateMutation.isLoading}
                onClick={() => deactivateMutation.mutate(p.id)}
                sx={{ minWidth: 0, p: 1 }}
              >
                <DeleteRoundedIcon fontSize="small" />
              </Button>
            )}
          </Box>
        ))}
      </Box>

      <Fab
        color="primary"
        onClick={openCreate}
        sx={{ position: "fixed", bottom: 24, right: 24 }}
      >
        <AddRoundedIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? t("vendor.editProduct") : t("vendor.newProduct")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="vendor-category-label">{t("vendor.category")}</InputLabel>
            <Select
              labelId="vendor-category-label"
              label={t("vendor.category")}
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {flatCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.indent ? `— ${cat.name}` : cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("vendor.productName")}
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label={t("vendor.productDescription")}
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              label={t("vendor.price")}
              type="number"
              fullWidth
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <TextField
              label={t("vendor.discountPrice")}
              type="number"
              fullWidth
              value={form.discountPrice}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
            />
          </Box>
          <TextField
            label={t("vendor.stock")}
            type="number"
            fullWidth
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <TextField
            label={t("vendor.images")}
            helperText={t("vendor.imagesHelp")}
            fullWidth
            multiline
            minRows={2}
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog}>{t("vendor.cancel")}</Button>
          <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ fontWeight: 700 }}>
            {saving ? t("vendor.saving") : t("vendor.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("vendor.manageCategories")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("vendor.categoriesShared")}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {flatCategories.length === 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("vendor.noCategories")}
              </Typography>
            )}
            {flatCategories.map((cat) => (
              <Chip key={cat.id} label={cat.indent ? `— ${cat.name}` : cat.name} size="small" />
            ))}
          </Box>

          <TextField
            label={t("vendor.categoryName")}
            fullWidth
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel id="vendor-parent-category-label">{t("vendor.parentCategory")}</InputLabel>
            <Select
              labelId="vendor-parent-category-label"
              label={t("vendor.parentCategory")}
              value={categoryForm.parentId}
              onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
            >
              <MenuItem value="">
                <em>{t("vendor.noParentCategory")}</em>
              </MenuItem>
              {(categories || [])
                .filter((cat) => !cat.parentId)
                .map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCategoryDialogOpen(false)}>{t("vendor.close")}</Button>
          <Button
            variant="contained"
            disabled={createCategoryMutation.isLoading}
            onClick={handleCreateCategory}
            sx={{ fontWeight: 700 }}
          >
            {createCategoryMutation.isLoading ? t("vendor.saving") : t("vendor.addCategory")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
