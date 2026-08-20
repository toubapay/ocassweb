import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import SimCardRoundedIcon from "@mui/icons-material/SimCardRounded";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TopBar from "../../../src/components/layout/TopBar";
import { formatCfa } from "../../../src/utils/currency";
import {
  detectOperator,
  fetchMobileForfaits,
  fetchMobileFeeQuote,
  createTopup,
  createForfaitTopup,
} from "../../../src/api/mobile";

const CATEGORY_COLORS = [
  { bg: "#FFF3E0", fg: "#E65100" },
  { bg: "#E3F2FD", fg: "#0D47A1" },
  { bg: "#E8F5E9", fg: "#1B5E20" },
  { bg: "#F3E5F5", fg: "#4A148C" },
  { bg: "#FCE4EC", fg: "#880E4F" },
];

function categoryColor(index) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function groupByCategory(forfaits) {
  const groups = [];
  const byName = new Map();
  (forfaits || []).forEach((f) => {
    if (!byName.has(f.category)) {
      byName.set(f.category, { category: f.category, items: [] });
      groups.push(byName.get(f.category));
    }
    byName.get(f.category).items.push(f);
  });
  return groups;
}

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

// Step 2 of the Wave-style "Buy Airtime" flow: a recipient card (operator
// auto-detected server-side, same as the old inline form), a mode toggle
// between a custom amount (entered via an on-screen numeric keypad,
// mirroring the reference design) and the existing forfait catalog, and a
// confirm dialog before either purchase actually fires.
export default function AirtimeAmount() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { phone, label } = router.query;

  const [mode, setMode] = useState("amount"); // "amount" | "packages"
  const [digits, setDigits] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForfait, setPendingForfait] = useState(null);

  const amount = digits ? Number(digits) : 0;

  const { data: service, isLoading: detecting } = useQuery(
    ["detect-operator", phone],
    () => detectOperator(phone),
    { enabled: !!phone }
  );

  const { data: forfaits, isLoading: forfaitsLoading } = useQuery(
    ["mobile-forfaits", service?.id],
    () => fetchMobileForfaits(service.id),
    { enabled: mode === "packages" && !!service?.id }
  );

  const topupMutation = useMutation(() => createTopup(service.id, phone, amount), {
    onSuccess: (transaction) => {
      toast.success(t("topup.airtime.success", { reference: transaction.reference }));
      queryClient.invalidateQueries("mobile-transactions");
      router.push("/topup");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("topup.airtime.failed")),
  });

  const forfaitMutation = useMutation((forfaitId) => createForfaitTopup(forfaitId, phone), {
    onSuccess: (transaction) => {
      toast.success(t("topup.airtime.success", { reference: transaction.reference }));
      queryClient.invalidateQueries("mobile-transactions");
      router.push("/topup");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("topup.airtime.failed")),
  });

  const tapDigit = (d) => setDigits((prev) => (prev.length >= 9 ? prev : prev + d));
  const backspace = () => setDigits((prev) => prev.slice(0, -1));

  const openAmountConfirm = () => {
    if (amount <= 0) return;
    if (!service) {
      toast.error(t("topup.airtime.selectOperator"));
      return;
    }
    setPendingForfait(null);
    setConfirmOpen(true);
  };

  const openForfaitConfirm = (forfait) => {
    setPendingForfait(forfait);
    setConfirmOpen(true);
  };

  const { data: quote, isLoading: quoteLoading } = useQuery(
    ["mobile-fee-quote", pendingForfait?.id, service?.id, amount],
    () =>
      fetchMobileFeeQuote(
        pendingForfait ? { forfaitId: pendingForfait.id } : { serviceId: service.id, amount }
      ),
    { enabled: confirmOpen }
  );

  const confirmTotal = quote?.total ?? (pendingForfait ? pendingForfait.price : amount);

  const handleConfirm = () => {
    setConfirmOpen(false);
    if (pendingForfait) {
      forfaitMutation.mutate(pendingForfait.id);
    } else {
      topupMutation.mutate();
    }
  };

  if (!phone) {
    return (
      <Box>
        <TopBar title={t("topup.airtime.buyTitle")} showCart={false} showSearch={false} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("topup.airtime.buyTitle")} showCart={false} showSearch={false} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2.5, pb: 1.5 }}>
        <Avatar src={service?.logoUrl} sx={{ bgcolor: "primary.light", width: 44, height: 44 }}>
          {!service?.logoUrl && <SimCardRoundedIcon sx={{ color: "primary.main" }} />}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{label || phone}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {detecting ? t("common.loading") : service?.name || phone}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2.5, pb: 1.5, display: "flex", gap: 1 }}>
        <Chip
          label={t("topup.airtime.customTab")}
          onClick={() => setMode("amount")}
          color={mode === "amount" ? "primary" : "default"}
          variant={mode === "amount" ? "filled" : "outlined"}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          label={t("topup.airtime.forfaitsTab")}
          onClick={() => setMode("packages")}
          color={mode === "packages" ? "primary" : "default"}
          variant={mode === "packages" ? "filled" : "outlined"}
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {mode === "amount" ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 2 }}>
            {t("topup.airtime.amountLabel")}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, my: 1 }}>
            {digits ? Number(digits).toLocaleString("en-US") : "0"}
          </Typography>

          <Box sx={{ width: "100%", px: 2.5, mt: 2, mb: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={amount <= 0 || topupMutation.isLoading}
              onClick={openAmountConfirm}
              sx={{ fontWeight: 800, py: 1.25 }}
            >
              {topupMutation.isLoading ? t("topup.airtime.processing") : t("topup.airtime.topUp")}
            </Button>
          </Box>

          <Box sx={{ width: "100%", maxWidth: 320 }}>
            {KEYPAD_ROWS.map((row, ri) => (
              <Box key={ri} sx={{ display: "flex", justifyContent: "space-evenly", mb: 1 }}>
                {row.map((key, ki) =>
                  key === "" ? (
                    <Box key={ki} sx={{ width: 72, height: 56 }} />
                  ) : key === "back" ? (
                    <IconButton key={ki} onClick={backspace} sx={{ width: 72, height: 56 }}>
                      <BackspaceOutlinedIcon />
                    </IconButton>
                  ) : (
                    <Button
                      key={ki}
                      onClick={() => tapDigit(key)}
                      sx={{ width: 72, height: 56, fontSize: 24, fontWeight: 700, color: "text.primary" }}
                    >
                      {key}
                    </Button>
                  )
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 2.5, pt: 0.5 }}>
          {!service && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("topup.airtime.forfaits.selectOperatorFirst")}
            </Typography>
          )}
          {service && forfaitsLoading && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("topup.airtime.forfaits.loading")}
            </Typography>
          )}
          {service && !forfaitsLoading && (forfaits || []).length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("topup.airtime.forfaits.empty")}
            </Typography>
          )}
          {groupByCategory(forfaits).map((group, gi) => {
            const color = categoryColor(gi);
            return (
              <Box key={group.category} sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    bgcolor: color.bg,
                    color: color.fg,
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.75,
                    mb: 1,
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {group.category}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {group.items.map((forfait) => (
                    <Box
                      key={forfait.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid #EEEEEE",
                        borderRadius: 3,
                        p: 1.5,
                        gap: 1,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {forfait.name} · {formatCfa(forfait.price)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {forfait.callMinutesLabel &&
                            `${t("topup.airtime.forfaits.calls")}: ${forfait.callMinutesLabel}`}
                          {forfait.callMinutesLabel && forfait.internetLabel && " · "}
                          {forfait.internetLabel &&
                            `${t("topup.airtime.forfaits.internet")}: ${forfait.internetLabel}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {t("topup.airtime.forfaits.validity")}: {forfait.validityLabel}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={forfaitMutation.isLoading}
                        onClick={() => openForfaitConfirm(forfait)}
                        sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {forfaitMutation.isLoading && forfaitMutation.variables === forfait.id
                          ? t("topup.airtime.forfaits.buying")
                          : t("topup.airtime.forfaits.buy")}
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {t("topup.airtime.confirmTitle")}
          <IconButton onClick={() => setConfirmOpen(false)} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography sx={{ color: "text.secondary" }}>{t("topup.airtime.phoneNumber")}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{phone}</Typography>
          </Box>
          {quote && (quote.feeAmount > 0 || quote.taxAmount > 0) && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {t("topup.airtime.subtotal")}
                </Typography>
                <Typography variant="body2">{formatCfa(quote.subtotal)}</Typography>
              </Box>
              {quote.feeAmount > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {t("admin.serviceFees.fee")}
                  </Typography>
                  <Typography variant="body2">{formatCfa(quote.feeAmount)}</Typography>
                </Box>
              )}
              {quote.taxAmount > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {t("admin.serviceFees.tva")}
                  </Typography>
                  <Typography variant="body2">{formatCfa(quote.taxAmount)}</Typography>
                </Box>
              )}
            </>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "text.secondary" }}>{t("topup.airtime.total")}</Typography>
            <Typography sx={{ fontWeight: 800 }}>
              {quoteLoading ? t("common.loading") : formatCfa(confirmTotal)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleConfirm}
            disabled={quoteLoading || topupMutation.isLoading || forfaitMutation.isLoading}
            sx={{ fontWeight: 800, py: 1.1 }}
          >
            {topupMutation.isLoading || forfaitMutation.isLoading ? (
              <CircularProgress size={22} />
            ) : (
              t("topup.airtime.confirm")
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
