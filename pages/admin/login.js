import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import toast from "react-hot-toast";
import useAuth from "../../src/hooks/useAuth";

/**
 * The admin console's own entrance - email + password, entirely separate
 * from the customer phone/OTP flow at /auth/login. There's deliberately no
 * self-service path here: this only ever succeeds for an account an
 * existing admin already promoted and gave a password (see README's "Admin
 * panel" section and POST /auth/admin/login).
 */
export default function AdminLogin() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user, adminLogin, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = isAuthenticated && user?.role === "ADMIN";

  if (isAdmin) {
    router.replace("/admin");
    return null;
  }

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error(t("admin.login.enterCredentials"));
      return;
    }
    setLoading(true);
    try {
      await adminLogin(email, password);
      router.replace("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || t("admin.login.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && !isAdmin) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", px: 3, gap: 2 }}>
        <AdminPanelSettingsRoundedIcon sx={{ fontSize: 48, color: "primary.main" }} />
        <Typography sx={{ textAlign: "center" }}>
          {t("admin.login.signedInAsOther", { name: user?.name || user?.phone })}
        </Typography>
        <Button variant="outlined" onClick={logout} sx={{ fontWeight: 700 }}>
          {t("admin.login.logOutFirst")}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", px: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <AdminPanelSettingsRoundedIcon sx={{ fontSize: 48, color: "primary.main" }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, textAlign: "center" }}>
        {t("admin.login.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 4, textAlign: "center" }}>
        {t("admin.login.subtitle")}
      </Typography>

      <TextField
        label={t("admin.login.email")}
        type="email"
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <TextField
        label={t("admin.login.password")}
        type="password"
        fullWidth
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 3 }}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={loading}
        onClick={handleSubmit}
        sx={{ py: 1.5, fontWeight: 700 }}
      >
        {loading ? t("admin.login.signingIn") : t("admin.login.signIn")}
      </Button>
    </Box>
  );
}
