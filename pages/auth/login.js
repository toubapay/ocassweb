import { useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import toast from "react-hot-toast";
import "react-phone-input-2/lib/style.css";
import useAuth from "../../src/hooks/useAuth";

const PhoneInput = dynamic(() => import("react-phone-input-2"), { ssr: false });

export default function Login() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || phone.length < 8) {
      toast.error("Enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(`+${phone}`);
      if (res.devCode) {
        toast.success(`Dev OTP: ${res.devCode}`, { duration: 6000 });
      } else {
        toast.success("Code sent");
      }
      router.push(`/auth/verify?phone=${encodeURIComponent(`+${phone}`)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", px: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        Welcome to Ocass
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
        Enter your phone number to sign in or create an account.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <PhoneInput
          country="ci"
          value={phone}
          onChange={setPhone}
          inputStyle={{ width: "100%", height: 52, borderRadius: 10 }}
          buttonStyle={{ borderRadius: "10px 0 0 10px" }}
        />
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={loading}
        onClick={handleSubmit}
        sx={{ py: 1.5, fontWeight: 700 }}
      >
        {loading ? "Sending..." : "Send code"}
      </Button>
    </Box>
  );
}
