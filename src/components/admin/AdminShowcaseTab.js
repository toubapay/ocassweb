import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Autocomplete from "@mui/material/Autocomplete";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  fetchAdminShowcaseSlides,
  createAdminShowcaseSlide,
  updateAdminShowcaseSlide,
  deleteAdminShowcaseSlide,
  updateAdminProductFeatured,
} from "../../api/admin";
import { fetchProducts } from "../../api/ecommerce";
import { compressImageFile } from "../../utils/imageFile";

/** Shared by the inline create row and the edit dialog below. */
function UploadImageButton({ onUploaded }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      onUploaded(await compressImageFile(file));
    } catch (err) {
      toast.error(err.message === "too-large" ? t("vendor.imageTooLarge") : t("vendor.notAnImage"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Button component="label" size="small" startIcon={<UploadRoundedIcon />} disabled={uploading}>
      {uploading ? t("common.loading") : t("vendor.uploadImage")}
      <input type="file" accept="image/*" hidden onChange={handleChange} />
    </Button>
  );
}

const emptySlideForm = () => ({
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: 0,
  isActive: true,
});

function slideToPayload(form) {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || undefined,
    imageUrl: form.imageUrl.trim(),
    linkUrl: form.linkUrl.trim() || undefined,
    sortOrder: Number(form.sortOrder) || 0,
    isActive: form.isActive,
  };
}

function EditSlideDialog({ slide, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: slide.title,
    subtitle: slide.subtitle || "",
    imageUrl: slide.imageUrl,
    linkUrl: slide.linkUrl || "",
    sortOrder: slide.sortOrder,
    isActive: slide.isActive,
  });

  const mutation = useMutation(() => updateAdminShowcaseSlide(slide.id, slideToPayload(form)), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-showcase-slides");
      toast.success(t("admin.showcase.updated"));
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.showcase.saveFailed")),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.showcase.editSlide")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          label={t("admin.showcase.title")}
          fullWidth
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <TextField
          label={t("admin.showcase.subtitle")}
          fullWidth
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
        <TextField
          label={t("admin.showcase.imageUrl")}
          fullWidth
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <UploadImageButton onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
          {form.imageUrl.trim() && (
            <Avatar src={form.imageUrl.trim()} variant="rounded" sx={{ width: 64, height: 64 }}>
              <ImageRoundedIcon />
            </Avatar>
          )}
        </Box>
        <TextField
          label={t("admin.showcase.linkUrl")}
          placeholder="/ecommerce/electronics"
          fullWidth
          value={form.linkUrl}
          onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
        />
        <TextField
          label={t("admin.showcase.sortOrder")}
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          sx={{ maxWidth: 140 }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Switch
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          <Typography variant="body2">{t("admin.showcase.active")}</Typography>
        </Box>
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

function ShowcaseSlidesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptySlideForm());
  const [editingSlide, setEditingSlide] = useState(null);

  const { data: slides, isLoading } = useQuery("admin-showcase-slides", fetchAdminShowcaseSlides);

  const createMutation = useMutation(createAdminShowcaseSlide, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-showcase-slides");
      toast.success(t("admin.showcase.created"));
      setForm(emptySlideForm());
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.showcase.saveFailed")),
  });

  const deleteMutation = useMutation(deleteAdminShowcaseSlide, {
    onSuccess: () => queryClient.invalidateQueries("admin-showcase-slides"),
  });

  const toggleMutation = useMutation(
    ({ id, isActive }) => updateAdminShowcaseSlide(id, { isActive }),
    { onSuccess: () => queryClient.invalidateQueries("admin-showcase-slides") }
  );

  const handleCreate = () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      toast.error(t("admin.showcase.slideFieldsRequired"));
      return;
    }
    createMutation.mutate(slideToPayload(form));
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.showcase.slidesTitle")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("admin.showcase.slidesSubtitle")}
      </Typography>

      <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t("admin.showcase.newSlide")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label={t("admin.showcase.title")}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
          />
          <TextField
            label={t("admin.showcase.subtitle")}
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            fullWidth
          />
          <TextField
            label={t("admin.showcase.imageUrl")}
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            fullWidth
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <UploadImageButton onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
            {form.imageUrl.trim() && (
              <Avatar src={form.imageUrl.trim()} variant="rounded" sx={{ width: 64, height: 64 }}>
                <ImageRoundedIcon />
              </Avatar>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              size="small"
              label={t("admin.showcase.linkUrl")}
              placeholder="/ecommerce/electronics"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              sx={{ minWidth: 220 }}
            />
            <TextField
              size="small"
              type="number"
              label={t("admin.showcase.sortOrder")}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              sx={{ width: 120 }}
            />
          </Box>
        </Box>
        <Button
          variant="contained"
          disabled={createMutation.isLoading}
          onClick={handleCreate}
          sx={{ mt: 2 }}
        >
          {t("admin.showcase.add")}
        </Button>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (slides || []).map((slide) => (
          <Box
            key={slide.id}
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
              opacity: slide.isActive ? 1 : 0.55,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src={slide.imageUrl} variant="rounded" sx={{ width: 48, height: 48 }}>
                <ImageRoundedIcon />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{slide.title}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("admin.showcase.sortOrder")}: {slide.sortOrder}
                  {slide.linkUrl ? ` · ${slide.linkUrl}` : ""}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton size="small" onClick={() => setEditingSlide(slide)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => deleteMutation.mutate(slide.id)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
              <Switch
                checked={slide.isActive}
                onChange={(e) => toggleMutation.mutate({ id: slide.id, isActive: e.target.checked })}
              />
            </Box>
          </Box>
        ))
      )}

      {editingSlide && <EditSlideDialog slide={editingSlide} onClose={() => setEditingSlide(null)} />}
    </Box>
  );
}

function FeaturedProductsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState("");

  const { data: featured, isLoading } = useQuery(["admin-featured-products"], () =>
    fetchProducts({ featured: true, pageSize: 50 })
  );
  const { data: searchResults, isFetching: searching } = useQuery(
    ["admin-featured-product-search", productSearch],
    () => fetchProducts({ search: productSearch, pageSize: 10 }),
    { enabled: productSearch.trim().length > 1 }
  );

  const setFeaturedMutation = useMutation(
    ({ id, isFeatured }) => updateAdminProductFeatured(id, isFeatured),
    {
      onSuccess: () => queryClient.invalidateQueries("admin-featured-products"),
      onError: (err) => toast.error(err.response?.data?.message || t("admin.showcase.saveFailed")),
    }
  );

  const featuredIds = new Set((featured?.items || []).map((p) => p.id));

  return (
    <Box sx={{ mt: 4 }}>
      <Divider sx={{ mb: 3 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.showcase.featuredProductsTitle")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("admin.showcase.featuredProductsSubtitle")}
      </Typography>

      <Autocomplete
        value={null}
        inputValue={productSearch}
        onInputChange={(e, value) => setProductSearch(value)}
        onChange={(e, product) => {
          if (product) setFeaturedMutation.mutate({ id: product.id, isFeatured: true });
        }}
        options={(searchResults?.items || []).filter((p) => !featuredIds.has(p.id))}
        loading={searching}
        getOptionLabel={(p) => p.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(x) => x}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("admin.showcase.searchProducts")}
            placeholder={t("admin.showcase.searchProductsPlaceholder")}
          />
        )}
        sx={{ mb: 2, maxWidth: 420 }}
      />

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (featured?.items || []).length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("admin.showcase.noFeaturedProducts")}
        </Typography>
      ) : (
        (featured?.items || []).map((product) => (
          <Box
            key={product.id}
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
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src={product.images?.[0]} variant="rounded" sx={{ width: 40, height: 40 }}>
                <CategoryRoundedIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{product.name}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {product.store?.name}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              disabled={setFeaturedMutation.isLoading}
              onClick={() => setFeaturedMutation.mutate({ id: product.id, isFeatured: false })}
            >
              <DeleteRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        ))
      )}
    </Box>
  );
}

export default function AdminShowcaseTab() {
  return (
    <Box>
      <ShowcaseSlidesSection />
      <FeaturedProductsSection />
    </Box>
  );
}
