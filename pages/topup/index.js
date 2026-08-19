import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import { fetchMobileServices, createBillPayment, fetchMyMobileTransactions } from "../../src/api/mobile";
import { formatCfa } from "../../src/utils/currency";

const STATUS_COLOR = { SUCCESS: "success", PENDING: "warning", FAILED: "error" };

export default function TopUp() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  // Bill payment state
  const [billServiceId, setBillServiceId] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [billAmount, setBillAmount] = useState("");

  // Deep-link support for the home screen's separate Airtime / Bills tiles
  // (?tab=airtime|bill) so each opens straight to the right tab.
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.tab === "bill") setTab(1);
    else if (router.query.tab === "airtime") setTab(0);
  }, [router.isReady, router.query.tab]);

  const { data: billers } = useQuery("mobile-services-bill", () => fetchMobileServices("BILL"));
  const { data: transactions } = useQuery("mobile-transactions", fetchMyMobileTransactions, {
    enabled: isAuthenticated,
  });

  const billMutation = useMutation(
    () => createBillPayment(billServiceId, accountNumber, Number(billAmount)),
    {
      onSuccess: (transaction) => {
        toast.success(t("topup.bill.success", { reference: transaction.reference }));
        queryClient.invalidateQueries("mobile-transactions");
        setAccountNumber("");
        setBillAmount("");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("topup.bill.failed")),
    }
  );

  const requireLogin = (action) => {
    if (!isAuthenticated) {
      toast(t("topup.loginToContinue"));
      router.push("/auth/login");
      return;
    }
    action();
  };

  const handleBillPayment = () => {
    if (!billServiceId) return toast.error(t("topup.bill.selectBiller"));
    if (!accountNumber) return toast.error(t("topup.bill.enterAccountNumber"));
    if (!billAmount || Number(billAmount) <= 0) return toast.error(t("topup.bill.enterAmount"));
    requireLogin(() => billMutation.mutate());
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("topup.title")} showBack={false} showSearch={false} showCart={false} />

      <Box sx={{ px: 1 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ "& .MuiTab-root": { fontWeight: 700, textTransform: "none" } }}
        >
          <Tab label={t("topup.airtimeTab")} />
          <Tab label={t("topup.billTab")} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            {t("topup.airtime.heading")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
            {t("topup.airtime.launcherSubtitle")}
          </Typography>

          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<AddCircleRoundedIcon />}
            onClick={() => requireLogin(() => router.push("/topup/airtime/recipient"))}
            sx={{ fontWeight: 800, py: 1.25 }}
          >
            {t("topup.airtime.buyTitle")}
          </Button>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
            {t("topup.bill.heading")}
          </Typography>

          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {t("topup.bill.biller")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1, mb: 2.5 }}>
            {(billers || []).map((biller) => (
              <Box
                key={biller.id}
                onClick={() => setBillServiceId(biller.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: billServiceId === biller.id ? "primary.main" : "#EEEEEE",
                  borderRadius: 3,
                  cursor: "pointer",
                  bgcolor: billServiceId === biller.id ? "primary.light" : "transparent",
                }}
              >
                <Avatar src={biller.logoUrl} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {biller.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {biller.billCategory}
                  </Typography>
                </Box>
                {billServiceId === biller.id && (
                  <CheckCircleRoundedIcon sx={{ color: "primary.main" }} />
                )}
              </Box>
            ))}
          </Box>

          <TextField
            label={t("topup.bill.accountNumber")}
            fullWidth
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            sx={{ mb: 2.5 }}
          />

          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {t("topup.bill.amount")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1, mb: 1.5 }}>
            {[1000, 5000, 10000, 20000].map((amt) => (
              <Chip
                key={amt}
                label={formatCfa(amt)}
                onClick={() => setBillAmount(String(amt))}
                color={billAmount === String(amt) ? "primary" : "default"}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
          <TextField
            label={t("topup.bill.amountLabel")}
            fullWidth
            type="number"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            sx={{ mb: 2.5 }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={billMutation.isLoading}
            onClick={handleBillPayment}
            sx={{ fontWeight: 800, py: 1.25 }}
          >
            {billMutation.isLoading ? t("topup.bill.processing") : t("topup.bill.payBill")}
          </Button>
        </Box>
      )}

      {isAuthenticated && (transactions || []).length > 0 && (
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            {t("topup.recentTransactions")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {transactions.map((tx) => (
              <Box key={tx.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar src={tx.service.logoUrl} sx={{ width: 28, height: 28 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {tx.service.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={t(`topup.transactionStatus.${tx.status}`, { defaultValue: tx.status })}
                    size="small"
                    color={STATUS_COLOR[tx.status] || "default"}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {tx.phoneNumber || tx.accountNumber} · {formatCfa(tx.amount)} · {tx.reference}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
