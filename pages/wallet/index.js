import { useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchWallet, fetchWalletTransactions, topUpWallet } from "../../src/api/wallet";
import { formatCfa } from "../../src/utils/currency";

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];

const TYPE_LABEL = {
  TOPUP: "Top-up",
  PAYMENT: "Payment",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
};

export default function Wallet() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const { data: wallet, isLoading: walletLoading } = useQuery("wallet", fetchWallet, {
    enabled: isAuthenticated,
  });
  const { data: transactions, isLoading: txLoading } = useQuery(
    "wallet-transactions",
    fetchWalletTransactions,
    { enabled: isAuthenticated }
  );

  const topUpMutation = useMutation((amt) => topUpWallet(amt), {
    onSuccess: ({ paymentUrl }) => {
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || "Could not start top-up"),
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title="Wallet" showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>Log in to see your wallet.</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            Log in
          </Button>
        </Box>
      </Box>
    );
  }

  const handleTopUp = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    topUpMutation.mutate(value);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title="Wallet" showCart={false} showSearch={false} />

      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{
            borderRadius: 4,
            p: 3,
            background: "linear-gradient(135deg, #0FAE58 0%, #0B8A45 100%)",
            color: "#fff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <AccountBalanceWalletRoundedIcon />
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600 }}>
              Wallet balance
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {walletLoading ? "..." : formatCfa(wallet?.balance ?? 0)}
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2.5, bgcolor: "#fff", color: "primary.main", fontWeight: 800, "&:hover": { bgcolor: "#fff" } }}
            onClick={() => setTopUpOpen(true)}
          >
            Top up wallet
          </Button>
        </Box>
      </Box>

      <Box sx={{ px: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          Transaction history
        </Typography>
        {txLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Loading...
          </Typography>
        )}
        {!txLoading && (transactions || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No transactions yet.
          </Typography>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {(transactions || []).map((tx) => {
            const isCredit = tx.direction === "CREDIT";
            return (
              <Box
                key={tx.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid #EEEEEE",
                  borderRadius: 3,
                  p: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: isCredit ? "#E7F7EE" : "#FDECEC",
                    }}
                  >
                    {isCredit ? (
                      <ArrowDownwardRoundedIcon sx={{ color: "#0FAE58", fontSize: 18 }} />
                    ) : (
                      <ArrowUpwardRoundedIcon sx={{ color: "#E5484D", fontSize: 18 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {tx.description || TYPE_LABEL[tx.type] || tx.type}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, color: isCredit ? "#0FAE58" : "#E5484D" }}
                >
                  {isCredit ? "+" : "-"}
                  {formatCfa(tx.amount)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Dialog open={topUpOpen} onClose={() => setTopUpOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Top up wallet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2, mt: 1 }}>
            {QUICK_AMOUNTS.map((amt) => (
              <Chip
                key={amt}
                label={formatCfa(amt)}
                onClick={() => setAmount(String(amt))}
                variant={amount === String(amt) ? "filled" : "outlined"}
                color={amount === String(amt) ? "primary" : "default"}
              />
            ))}
          </Box>
          <TextField
            label="Amount (CFA)"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTopUpOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={topUpMutation.isLoading}
            onClick={handleTopUp}
            sx={{ fontWeight: 700 }}
          >
            {topUpMutation.isLoading ? "Starting..." : "Continue to payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
