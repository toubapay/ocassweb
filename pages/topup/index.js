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
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import ContactPhoneRoundedIcon from "@mui/icons-material/ContactPhoneRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchMobileServices,
  detectOperator,
  createTopup,
  createBillPayment,
  fetchMyMobileTransactions,
} from "../../src/api/mobile";
import { formatCfa } from "../../src/utils/currency";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const STATUS_COLOR = { SUCCESS: "success", PENDING: "warning", FAILED: "error" };

export default function TopUp() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  // Airtime state
  const [phone, setPhone] = useState("+221");
  const [airtimeServiceId, setAirtimeServiceId] = useState(null);
  const [airtimeAmount, setAirtimeAmount] = useState("");
  const [contactsSupported, setContactsSupported] = useState(false);

  // Bill payment state
  const [billServiceId, setBillServiceId] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [billAmount, setBillAmount] = useState("");

  useEffect(() => {
    setContactsSupported(
      typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window
    );
  }, []);

  // Deep-link support for the home screen's separate Airtime / Bills tiles
  // (?tab=airtime|bill) so each opens straight to the right tab.
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.tab === "bill") setTab(1);
    else if (router.query.tab === "airtime") setTab(0);
  }, [router.isReady, router.query.tab]);

  const { data: operators } = useQuery("mobile-services-airtime", () =>
    fetchMobileServices("AIRTIME")
  );
  const { data: billers } = useQuery("mobile-services-bill", () => fetchMobileServices("BILL"));
  const { data: transactions } = useQuery("mobile-transactions", fetchMyMobileTransactions, {
    enabled: isAuthenticated,
  });

  // Auto-detect operator as the phone number is typed (debounced).
  useEffect(() => {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 8) return;
    const timer = setTimeout(() => {
      detectOperator(phone)
        .then((service) => {
          if (service) setAirtimeServiceId(service.id);
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [phone]);

  const pickContact = async () => {
    try {
      const contacts = await navigator.contacts.select(["tel"], { multiple: false });
      if (contacts[0]?.tel?.[0]) {
        setPhone(contacts[0].tel[0]);
      }
    } catch (err) {
      toast.error(t("topup.airtime.couldNotAccessContacts"));
    }
  };

  const topupMutation = useMutation(
    () => createTopup(airtimeServiceId, phone, Number(airtimeAmount)),
    {
      onSuccess: (transaction) => {
        toast.success(t("topup.airtime.success", { reference: transaction.reference }));
        queryClient.invalidateQueries("mobile-transactions");
        setAirtimeAmount("");
      },
      onError: (err) => toast.error(err.response?.data?.message || t("topup.airtime.failed")),
    }
  );

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

  const handleTopup = () => {
    if (!airtimeServiceId) return toast.error(t("topup.airtime.selectOperator"));
    if (!phone || phone.replace(/[^0-9]/g, "").length < 8) return toast.error(t("topup.airtime.invalidPhone"));
    if (!airtimeAmount || Number(airtimeAmount) <= 0) return toast.error(t("topup.airtime.enterAmount"));
    requireLogin(() => topupMutation.mutate());
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
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
            {t("topup.airtime.heading")}
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
            <TextField
              label={t("topup.airtime.phoneNumber")}
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {contactsSupported && (
              <IconButton
                onClick={pickContact}
                sx={{ bgcolor: "primary.light", color: "primary.main" }}
                title={t("topup.airtime.chooseFromContacts")}
              >
                <ContactPhoneRoundedIcon />
              </IconButton>
            )}
          </Box>
          {!contactsSupported && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: -1.5, mb: 2 }}>
              {t("topup.airtime.contactsNotSupported")}
            </Typography>
          )}

          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {t("topup.airtime.operator")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1, mb: 2.5 }}>
            {(operators || []).map((op) => (
              <Chip
                key={op.id}
                avatar={<Avatar src={op.logoUrl} />}
                label={op.name}
                onClick={() => setAirtimeServiceId(op.id)}
                color={airtimeServiceId === op.id ? "primary" : "default"}
                variant={airtimeServiceId === op.id ? "filled" : "outlined"}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>

          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {t("topup.airtime.amount")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1, mb: 1.5 }}>
            {QUICK_AMOUNTS.map((amt) => (
              <Chip
                key={amt}
                label={formatCfa(amt)}
                onClick={() => setAirtimeAmount(String(amt))}
                color={airtimeAmount === String(amt) ? "primary" : "default"}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
          <TextField
            label={t("topup.airtime.amountLabel")}
            fullWidth
            type="number"
            value={airtimeAmount}
            onChange={(e) => setAirtimeAmount(e.target.value)}
            sx={{ mb: 2.5 }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={topupMutation.isLoading}
            onClick={handleTopup}
            sx={{ fontWeight: 800, py: 1.25 }}
          >
            {topupMutation.isLoading ? t("topup.airtime.processing") : t("topup.airtime.topUp")}
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
