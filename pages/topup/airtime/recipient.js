import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Avatar from "@mui/material/Avatar";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ContactPhoneRoundedIcon from "@mui/icons-material/ContactPhoneRounded";
import TopBar from "../../../src/components/layout/TopBar";
import useAuth from "../../../src/hooks/useAuth";
import { fetchMyMobileTransactions } from "../../../src/api/mobile";

// Step 1 of the Wave-style "Buy Airtime" flow: pick who you're topping up.
// "Favorites" is just the distinct phone numbers pulled from the user's
// own AIRTIME transaction history (there's no separate favorites concept
// server-side). The browser Contact Picker API (navigator.contacts) only
// works on supported mobile browsers and only returns what the user
// explicitly picks per invocation - unlike the Flutter app there's no
// persistent, browsable device contacts list here.
export default function AirtimeRecipient() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [contactsSupported, setContactsSupported] = useState(false);

  useEffect(() => {
    setContactsSupported(
      typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window
    );
  }, []);

  const { data: transactions } = useQuery("mobile-transactions", fetchMyMobileTransactions, {
    enabled: isAuthenticated,
  });

  const favorites = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const tx of transactions || []) {
      if (tx.type !== "AIRTIME" || !tx.phoneNumber || seen.has(tx.phoneNumber)) continue;
      seen.add(tx.phoneNumber);
      list.push(tx.phoneNumber);
      if (list.length >= 8) break;
    }
    return list;
  }, [transactions]);

  const filteredFavorites = useMemo(() => {
    if (!query) return favorites;
    const digits = query.replace(/[^0-9]/g, "");
    if (!digits) return [];
    return favorites.filter((phone) => phone.replace(/[^0-9]/g, "").includes(digits));
  }, [favorites, query]);

  const goToAmount = (phone, label) => {
    if (!phone || phone.replace(/[^0-9]/g, "").length < 8) {
      toast.error(t("topup.airtime.invalidPhone"));
      return;
    }
    router.push({
      pathname: "/topup/airtime/amount",
      query: { phone, ...(label ? { label } : {}) },
    });
  };

  const pickContact = async () => {
    try {
      const contacts = await navigator.contacts.select(["tel", "name"], { multiple: false });
      const picked = contacts[0];
      if (picked?.tel?.[0]) goToAmount(picked.tel[0], picked.name?.[0]);
    } catch (err) {
      toast.error(t("topup.airtime.couldNotAccessContacts"));
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("topup.airtime.buyTitle")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2.5 }}>
        <TextField
          label={t("topup.airtime.toLabel")}
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goToAmount(query)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box
          onClick={() => goToAmount(query)}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, cursor: "pointer" }}
        >
          <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
            <AddCircleRoundedIcon fontSize="small" />
          </Avatar>
          <Typography sx={{ fontWeight: 700 }}>{t("topup.airtime.buyForNewNumber")}</Typography>
        </Box>

        {contactsSupported && (
          <Box
            onClick={pickContact}
            sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, cursor: "pointer" }}
          >
            <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 36, height: 36 }}>
              <ContactPhoneRoundedIcon fontSize="small" />
            </Avatar>
            <Typography sx={{ fontWeight: 700 }}>{t("topup.airtime.chooseFromContacts")}</Typography>
          </Box>
        )}

        {filteredFavorites.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              {t("topup.airtime.favorites")}
            </Typography>
            {filteredFavorites.map((phone) => (
              <Box
                key={phone}
                onClick={() => goToAmount(phone)}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, cursor: "pointer" }}
              >
                <Avatar sx={{ bgcolor: "action.selected", width: 36, height: 36 }}>
                  <HistoryRoundedIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{phone}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {phone}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {filteredFavorites.length === 0 && !query && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              {t("topup.airtime.favorites")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("topup.airtime.noFavorites")}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
