import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Avatar from "@mui/material/Avatar";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { fetchAdminHomeBanner, updateAdminHomeBanner } from "../../api/admin";
import { compressImageFile } from "../../utils/imageFile";
import { AdminCard, AdminSectionHeading } from "./AdminUiKit";

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

export default function AdminHomeBannerTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: banner, isLoading } = useQuery("admin-home-banner", fetchAdminHomeBanner);

  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", linkUrl: "", isActive: true });

  useEffect(() => {
    if (!banner) return;
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      linkUrl: banner.linkUrl || "",
      isActive: banner.isActive,
    });
  }, [banner]);

  const mutation = useMutation((payload) => updateAdminHomeBanner(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-home-banner");
      toast.success(t("admin.homeBanner.saved"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.homeBanner.saveFailed")),
  });

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error(t("admin.homeBanner.titleRequired"));
      return;
    }
    mutation.mutate({
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim(),
      isActive: form.isActive,
    });
  };

  return (
    <Box>
      <AdminSectionHeading title={t("admin.homeBanner.title")} subtitle={t("admin.homeBanner.subtitle")} />

      <AdminCard sx={{ p: { xs: 2, sm: 2.5 } }}>
        {isLoading ? (
          <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 460 }}>
            <FormControlLabel
              control={
                <Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              }
              label={form.isActive ? t("admin.homeBanner.shown") : t("admin.homeBanner.hidden")}
            />
            <TextField
              label={t("admin.homeBanner.bannerTitle")}
              fullWidth
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              label={t("admin.homeBanner.bannerSubtitle")}
              fullWidth
              multiline
              minRows={2}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
            <TextField
              label={t("admin.homeBanner.imageUrl")}
              fullWidth
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <UploadImageButton onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
              <Avatar src={form.imageUrl.trim() || undefined} variant="rounded" sx={{ width: 64, height: 64 }}>
                <CardGiftcardRoundedIcon />
              </Avatar>
            </Box>
            <TextField
              label={t("admin.homeBanner.linkUrl")}
              placeholder="/ecommerce"
              fullWidth
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            />
            <Button variant="contained" disabled={mutation.isLoading} onClick={handleSave} sx={{ alignSelf: "flex-start" }}>
              {t("common.save")}
            </Button>
          </Box>
        )}
      </AdminCard>
    </Box>
  );
}
