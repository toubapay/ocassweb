import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import OtpInput from "react-otp-input";
import toast from "react-hot-toast";
import useAuth from "../../src/hooks/useAuth";

export default function Verify() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = router.query;
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error(t("auth.verify.enterCode"));
      return;
    }
    setLoading(true);
    try {
      const user = await verifyOtp(phone, code, name || undefined);
      toast.success(t("auth.verify.welcome", { name: user.name ? `, ${user.name}` : "" }));
      router.push("/");
    } catch (err) {
      toast.error(err.response?.data?.message || t("auth.verify.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await requestOtp(phone);
      toast.success(res.devCode ? t("auth.verify.devOtp", { code: res.devCode }) : t("auth.verify.codeResent"));
    } catch {
      toast.error(t("auth.verify.couldNotResend"));
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", px: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        {t("auth.verify.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
        {t("auth.verify.subtitle", { phone })}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <OtpInput
          value={code}
          onChange={setCode}
          numInputs={6}
          renderSeparator={<Box sx={{ width: 8 }} />}
          renderInput={(props) => (
            <input
              {...props}
              style={{
                ...props.style,
                width: 44,
                height: 52,
                fontSize: 20,
                borderRadius: 10,
                border: "1px solid #DDDDDD",
                textAlign: "center",
              }}
            />
          )}
        />
      </Box>

      <TextField
        label={t("auth.verify.nameLabel")}
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={loading}
        onClick={handleVerify}
        sx={{ py: 1.5, fontWeight: 700, mb: 1.5 }}
      >
        {loading ? t("auth.verify.verifying") : t("auth.verify.verify")}
      </Button>
      <Button variant="text" fullWidth onClick={handleResend}>
        {t("auth.verify.resendCode")}
      </Button>
    </Box>
  );
}
