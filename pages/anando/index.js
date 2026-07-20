import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import TopBar from "../../src/components/layout/TopBar";
import AnandoIcon from "../../src/components/icons/AnandoIcon";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchAvailablePostings,
  fetchMyPostings,
  fetchMyBookings,
  createPosting,
  cancelPosting,
  departPosting,
  bookSeat,
  cancelBooking,
} from "../../src/api/anando";
import { formatCfa } from "../../src/utils/currency";

const emptyForm = {
  originAddress: "",
  destinationAddress: "",
  isInstant: false,
  departureAt: "",
  seatsTotal: "3",
  pricePerSeat: "",
  note: "",
};

function departureLabel(posting, t) {
  if (posting.isInstant) return t("anando.instantBadge");
  return new Date(posting.departureAt).toLocaleString();
}

export default function Anando() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [postOpen, setPostOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [bookTarget, setBookTarget] = useState(null); // posting being booked
  const [bookSeats, setBookSeats] = useState(1);
  const [bookMethod, setBookMethod] = useState("CASH");

  const { data: available, isLoading: loadingAvailable } = useQuery(
    "anando-available",
    fetchAvailablePostings,
    { enabled: isAuthenticated && tab === 0 }
  );
  const { data: myPostings, isLoading: loadingMine } = useQuery(
    "anando-my-postings",
    fetchMyPostings,
    { enabled: isAuthenticated && tab === 1 }
  );
  const { data: myBookings, isLoading: loadingBookings } = useQuery(
    "anando-my-bookings",
    fetchMyBookings,
    { enabled: isAuthenticated && tab === 2 }
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries("anando-available");
    queryClient.invalidateQueries("anando-my-postings");
    queryClient.invalidateQueries("anando-my-bookings");
  };

  const createMutation = useMutation((payload) => createPosting(payload), {
    onSuccess: () => {
      toast.success(t("anando.posted"));
      setPostOpen(false);
      setForm(emptyForm);
      invalidateAll();
      setTab(1);
    },
    onError: (err) => toast.error(err.response?.data?.message || t("anando.couldNotPost")),
  });

  const cancelPostingMutation = useMutation((id) => cancelPosting(id), {
    onSuccess: () => {
      toast.success(t("anando.postingCancelled"));
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("anando.couldNotCancel")),
  });

  const departMutation = useMutation((id) => departPosting(id), {
    onSuccess: () => {
      toast.success(t("anando.departed"));
      invalidateAll();
    },
  });

  const bookMutation = useMutation(
    ({ id, payload }) => bookSeat(id, payload),
    {
      onSuccess: (data) => {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
        toast.success(t("anando.booked"));
        setBookTarget(null);
        invalidateAll();
      },
      onError: (err) => toast.error(err.response?.data?.message || t("anando.couldNotBook")),
    }
  );

  const cancelBookingMutation = useMutation((id) => cancelBooking(id), {
    onSuccess: () => {
      toast.success(t("anando.bookingCancelled"));
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || t("anando.couldNotCancel")),
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("anando.title")} showSearch={false} showCart={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  const handlePost = () => {
    if (!form.originAddress.trim() || !form.destinationAddress.trim()) {
      toast.error(t("anando.enterAddresses"));
      return;
    }
    if (!form.isInstant && !form.departureAt) {
      toast.error(t("anando.chooseDeparture"));
      return;
    }
    createMutation.mutate({
      originAddress: form.originAddress.trim(),
      destinationAddress: form.destinationAddress.trim(),
      isInstant: form.isInstant,
      departureAt: form.isInstant ? undefined : new Date(form.departureAt).toISOString(),
      seatsTotal: Number(form.seatsTotal) || 1,
      pricePerSeat: form.pricePerSeat ? Number(form.pricePerSeat) : null,
      note: form.note.trim() || undefined,
    });
  };

  const openBook = (posting) => {
    setBookTarget(posting);
    setBookSeats(1);
    setBookMethod(posting.pricePerSeat ? "CASH" : "CASH");
  };

  const handleBook = () => {
    if (!bookTarget) return;
    bookMutation.mutate({
      id: bookTarget.id,
      payload: { seatsBooked: bookSeats, paymentMethod: bookMethod },
    });
  };

  const bookTotal = bookTarget?.pricePerSeat ? Number(bookTarget.pricePerSeat) * bookSeats : 0;

  return (
    <Box sx={{ pb: 10, position: "relative", minHeight: "100vh" }}>
      <TopBar title={t("anando.title")} showSearch={false} showCart={false} />

      <Box sx={{ px: 1 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{ "& .MuiTab-root": { fontWeight: 700, textTransform: "none", fontSize: 13 } }}
        >
          <Tab label={t("anando.tabs.available")} />
          <Tab label={t("anando.tabs.myPostings")} />
          <Tab label={t("anando.tabs.myBookings")} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loadingAvailable && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.loading")}
            </Typography>
          )}
          {!loadingAvailable && (available || []).length === 0 && (
            <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
              <AnandoIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2">{t("anando.noAvailable")}</Typography>
            </Box>
          )}
          {(available || []).map((p) => (
            <Box key={p.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.75 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {p.originAddress} → {p.destinationAddress}
                </Typography>
                {p.isInstant && (
                  <Chip
                    size="small"
                    icon={<BoltRoundedIcon sx={{ fontSize: 14 }} />}
                    label={t("anando.instantBadge")}
                    sx={{ bgcolor: "#FDF1F7", color: "#EC4899", fontWeight: 700 }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {p.driver?.name || p.driver?.phone} · {departureLabel(p, t)}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {p.pricePerSeat ? formatCfa(p.pricePerSeat) + " / " + t("anando.seat") : t("anando.freeOrCash")}
                  {" · "}
                  {t("anando.seatsLeft", { count: p.seatsAvailable })}
                </Typography>
                <Button size="small" variant="contained" onClick={() => openBook(p)} sx={{ fontWeight: 700 }}>
                  {t("anando.book")}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loadingMine && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.loading")}
            </Typography>
          )}
          {!loadingMine && (myPostings || []).length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
              {t("anando.noMyPostings")}
            </Typography>
          )}
          {(myPostings || []).map((p) => (
            <Box key={p.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.75 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {p.originAddress} → {p.destinationAddress}
                </Typography>
                <Chip
                  size="small"
                  label={t(`anando.status.${p.status}`)}
                  color={p.status === "OPEN" ? "success" : p.status === "CANCELLED" ? "error" : "default"}
                  variant={p.status === "OPEN" ? "filled" : "outlined"}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {departureLabel(p, t)} ·{" "}
                {t("anando.seatsFilled", { taken: p.seatsTotal - p.seatsAvailable, total: p.seatsTotal })}
              </Typography>
              {p.bookings?.length > 0 && (
                <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {p.bookings.map((b) => (
                    <Typography key={b.id} variant="caption" sx={{ color: "text.secondary" }}>
                      • {b.passenger?.name || b.passenger?.phone} — {b.seatsBooked} {t("anando.seat")}
                      {b.seatsBooked > 1 ? "s" : ""} ({t(`anando.paymentMethod.${b.paymentMethod}`)}
                      {b.paid ? `, ${t("anando.paid")}` : ""})
                    </Typography>
                  ))}
                </Box>
              )}
              {(p.status === "OPEN" || p.status === "FULL") && (
                <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={departMutation.isLoading}
                    onClick={() => departMutation.mutate(p.id)}
                  >
                    {t("anando.markDeparted")}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={cancelPostingMutation.isLoading}
                    onClick={() => cancelPostingMutation.mutate(p.id)}
                  >
                    {t("anando.cancel")}
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {tab === 2 && (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loadingBookings && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("common.loading")}
            </Typography>
          )}
          {!loadingBookings && (myBookings || []).length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
              {t("anando.noMyBookings")}
            </Typography>
          )}
          {(myBookings || []).map((b) => (
            <Box key={b.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.75 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {b.posting.originAddress} → {b.posting.destinationAddress}
                </Typography>
                <Chip
                  size="small"
                  label={t(`anando.bookingStatus.${b.status}`)}
                  color={b.status === "CONFIRMED" ? "success" : "default"}
                  variant={b.status === "CONFIRMED" ? "filled" : "outlined"}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {b.posting.driver?.name || b.posting.driver?.phone} · {departureLabel(b.posting, t)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>
                {b.seatsBooked} {t("anando.seat")}
                {b.seatsBooked > 1 ? "s" : ""} · {t(`anando.paymentMethod.${b.paymentMethod}`)}
                {b.paid ? ` · ${t("anando.paid")}` : ""}
              </Typography>
              {b.status === "CONFIRMED" && (
                <Button
                  size="small"
                  color="error"
                  sx={{ mt: 1 }}
                  disabled={cancelBookingMutation.isLoading}
                  onClick={() => cancelBookingMutation.mutate(b.id)}
                >
                  {t("anando.cancel")}
                </Button>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Fab color="primary" onClick={() => setPostOpen(true)} sx={{ position: "fixed", bottom: 24, right: 24 }}>
        <AddRoundedIcon />
      </Fab>

      {/* Post a ride dialog */}
      <Dialog open={postOpen} onClose={() => setPostOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("anando.postTitle")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={t("anando.origin")}
            fullWidth
            value={form.originAddress}
            onChange={(e) => setForm({ ...form, originAddress: e.target.value })}
          />
          <TextField
            label={t("anando.destination")}
            fullWidth
            value={form.destinationAddress}
            onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isInstant}
                onChange={(e) => setForm({ ...form, isInstant: e.target.checked })}
              />
            }
            label={t("anando.isInstant")}
          />
          {!form.isInstant && (
            <TextField
              label={t("anando.departureAt")}
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.departureAt}
              onChange={(e) => setForm({ ...form, departureAt: e.target.value })}
            />
          )}
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              label={t("anando.seatsTotal")}
              type="number"
              fullWidth
              inputProps={{ min: 1, max: 8 }}
              value={form.seatsTotal}
              onChange={(e) => setForm({ ...form, seatsTotal: e.target.value })}
            />
            <TextField
              label={t("anando.pricePerSeatOptional")}
              type="number"
              fullWidth
              value={form.pricePerSeat}
              onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })}
            />
          </Box>
          <TextField
            label={t("anando.noteOptional")}
            fullWidth
            multiline
            minRows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPostOpen(false)}>{t("anando.cancel")}</Button>
          <Button
            variant="contained"
            disabled={createMutation.isLoading}
            onClick={handlePost}
            sx={{ fontWeight: 700 }}
          >
            {createMutation.isLoading ? t("anando.posting") : t("anando.publish")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book a seat dialog */}
      <Dialog open={Boolean(bookTarget)} onClose={() => setBookTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("anando.bookTitle")}</DialogTitle>
        {bookTarget && (
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {bookTarget.originAddress} → {bookTarget.destinationAddress}
            </Typography>
            <TextField
              label={t("anando.seatsBooked")}
              type="number"
              fullWidth
              inputProps={{ min: 1, max: bookTarget.seatsAvailable }}
              value={bookSeats}
              onChange={(e) =>
                setBookSeats(Math.max(1, Math.min(bookTarget.seatsAvailable, Number(e.target.value) || 1)))
              }
            />
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                {t("anando.paymentMethodLabel")}
              </Typography>
              <ToggleButtonGroup
                value={bookMethod}
                exclusive
                fullWidth
                onChange={(e, v) => v && setBookMethod(v)}
                sx={{ mt: 0.5 }}
              >
                <ToggleButton value="CASH" sx={{ fontWeight: 700, fontSize: 12 }}>
                  {t("anando.paymentMethod.CASH")}
                </ToggleButton>
                <ToggleButton
                  value="WALLET"
                  disabled={!bookTarget.pricePerSeat}
                  sx={{ fontWeight: 700, fontSize: 12 }}
                >
                  {t("anando.paymentMethod.WALLET")}
                </ToggleButton>
                <ToggleButton
                  value="PAYDUNYA"
                  disabled={!bookTarget.pricePerSeat}
                  sx={{ fontWeight: 700, fontSize: 12 }}
                >
                  {t("anando.paymentMethod.PAYDUNYA")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {bookTarget.pricePerSeat ? (
              <Typography variant="body1" sx={{ fontWeight: 800, textAlign: "right" }}>
                {t("anando.total")}: {formatCfa(bookTotal)}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("anando.noPriceHint")}
              </Typography>
            )}
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBookTarget(null)}>{t("anando.cancel")}</Button>
          <Button
            variant="contained"
            disabled={bookMutation.isLoading}
            onClick={handleBook}
            sx={{ fontWeight: 700 }}
          >
            {bookMutation.isLoading ? t("anando.booking") : t("anando.confirmBooking")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
