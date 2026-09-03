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
import IconButton from "@mui/material/IconButton";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import Avatar from "@mui/material/Avatar";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMyProducts, createProduct, updateProduct, deactivateProduct } from "../../src/api/vendor";
import { fetchCategories } from "../../src/api/ecommerce";
import { formatCfa } from "../../src/utils/currency";
import { compressImageFile } from "../../src/utils/imageFile";

const emptyForm = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  stock: "",
  images: [],
};

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
  const isVendor = isAuthenticated && Boolean(user?.store);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: products, isLoading } = useQuery("vendor-products", fetchMyProducts, {
    enabled: isVendor,
  });
  // Categories are admin-curated (see AdminCategoriesTab.js) - vendors pick
  // from this shared list when tagging a product, they can't add to it.
  const { data: categories } = useQuery("categories", fetchCategories, { enabled: isVendor });
  const flatCategories = flattenCategories(categories);

  const invalidate = () => queryClient.invalidateQueries("vendor-products");

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
    setNewImageUrl("");
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setForm((f) => ({ ...f, images: [...f.images, newImageUrl.trim()] }));
    setNewImageUrl("");
  };

  const removeImage = (index) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await compressImageFile(file);
      setForm((f) => ({ ...f, images: [...f.images, dataUrl] }));
    } catch (err) {
      toast.error(
        err.message === "too-large" ? t("vendor.imageTooLarge") : t("vendor.notAnImage")
      );
    } finally {
      setUploadingImage(false);
    }
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
      images: product.images || [],
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
      images: form.images,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
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

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
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
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              {t("vendor.images")}
            </Typography>
            {form.images.length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                {form.images.map((url, index) => (
                  <Box key={index} sx={{ position: "relative" }}>
                    <Avatar src={url} variant="rounded" sx={{ width: 64, height: 64 }}>
                      <CategoryRoundedIcon />
                    </Avatar>
                    <IconButton
                      size="small"
                      onClick={() => removeImage(index)}
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        bgcolor: "#fff",
                        boxShadow: 1,
                        width: 22,
                        height: 22,
                        "&:hover": { bgcolor: "#fff" },
                      }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder={t("vendor.imageUrlPlaceholder")}
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <Button variant="outlined" disabled={!newImageUrl.trim()} onClick={addImageUrl}>
                {t("vendor.addImageUrl")}
              </Button>
            </Box>
            <Button
              component="label"
              size="small"
              startIcon={<UploadRoundedIcon />}
              disabled={uploadingImage}
              sx={{ mt: 1 }}
            >
              {uploadingImage ? t("common.loading") : t("vendor.uploadImage")}
              <input type="file" accept="image/*" hidden onChange={handleUpload} />
            </Button>
          </Box>
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
