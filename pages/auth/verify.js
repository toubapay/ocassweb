import { useState } from "react";
import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import OtpInput from "react-otp-input";
import toast from "react-hot-toast";
import useAuth from "../../src/hooks/useAuth";

export default function Verify() {
  const router = useRouter();
  const { phone } = router.query;
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const user = await verifyOtp(phone, code, name || undefined);
      toast.success(`Welcome${user.name ? `, ${user.name}` : ""}!`);
      router.push("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await requestOtp(phone);
      toast.success(res.devCode ? `Dev OTP: ${res.devCode}` : "Code resent");
    } catch {
      toast.error("Could not resend code");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", px: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        Verify your number
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
        We sent a 6-digit code to {phone}
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
        label="Your name (first time only)"
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
        {loading ? "Verifying..." : "Verify"}
      </Button>
      <Button variant="text" fullWidth onClick={handleResend}>
        Resend code
      </Button>
    </Box>
  );
}
