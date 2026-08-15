import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import Divider from "@mui/material/Divider";
import {
  fetchAdminMobileServices,
  createAdminMobileService,
  updateAdminMobileService,
  fetchAdminMobileForfaits,
  createAdminMobileForfait,
  updateAdminMobileForfait,
  fetchAdminInsurancePlans,
  createAdminInsurancePlan,
  updateAdminInsurancePlan,
} from "../../api/admin";

function MobileServicesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("AIRTIME");
  const [phonePrefixes, setPhonePrefixes] = useState("");

  const { data: services, isLoading } = useQuery("admin-mobile-services", fetchAdminMobileServices);

  const createMutation = useMutation(createAdminMobileService, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-mobile-services");
      toast.success(t("admin.services.created"));
      setName("");
      setPhonePrefixes("");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.services.saveFailed")),
  });

  const toggleMutation = useMutation(
    ({ id, isActive }) => updateAdminMobileService(id, { isActive }),
    { onSuccess: () => queryClient.invalidateQueries("admin-mobile-services") }
  );

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error(t("admin.services.nameRequired"));
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      type,
      phonePrefixes: phonePrefixes
        ? phonePrefixes.split(",").map((p) => p.trim()).filter(Boolean)
        : undefined,
    });
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.services.mobileTitle")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          label={t("admin.services.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <Select size="small" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="AIRTIME">AIRTIME</MenuItem>
          <MenuItem value="BILL">BILL</MenuItem>
        </Select>
        {type === "AIRTIME" && (
          <TextField
            size="small"
            label={t("admin.services.phonePrefixes")}
            placeholder="07,08,09"
            value={phonePrefixes}
            onChange={(e) => setPhonePrefixes(e.target.value)}
            sx={{ minWidth: 180 }}
          />
        )}
        <Button variant="contained" disabled={createMutation.isLoading} onClick={handleCreate}>
          {t("admin.services.add")}
        </Button>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (services || []).map((s) => (
          <Box
            key={s.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 1,
              px: 2,
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {s.type}
                {s.phonePrefixes?.length ? ` · ${s.phonePrefixes.join(", ")}` : ""}
              </Typography>
            </Box>
            <Switch
              checked={s.isActive}
              onChange={(e) => toggleMutation.mutate({ id: s.id, isActive: e.target.checked })}
            />
          </Box>
        ))
      )}
    </Box>
  );
}

function MobileForfaitsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [callMinutesLabel, setCallMinutesLabel] = useState("");
  const [internetLabel, setInternetLabel] = useState("");
  const [validityLabel, setValidityLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  const { data: services } = useQuery("admin-mobile-services", fetchAdminMobileServices);
  const airtimeServices = (services || []).filter((s) => s.type === "AIRTIME");

  const { data: forfaits, isLoading } = useQuery(
    ["admin-mobile-forfaits", serviceId],
    () => fetchAdminMobileForfaits(serviceId),
    { enabled: !!serviceId }
  );

  const createMutation = useMutation(createAdminMobileForfait, {
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-mobile-forfaits", serviceId]);
      toast.success(t("admin.services.forfaitCreated"));
      setCategory("");
      setName("");
      setPrice("");
      setCallMinutesLabel("");
      setInternetLabel("");
      setValidityLabel("");
      setSortOrder("");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.services.saveFailed")),
  });

  const toggleMutation = useMutation(
    ({ id, isActive }) => updateAdminMobileForfait(id, { isActive }),
    { onSuccess: () => queryClient.invalidateQueries(["admin-mobile-forfaits", serviceId]) }
  );

  const handleCreate = () => {
    if (!serviceId || !category.trim() || !name.trim() || !price || !validityLabel.trim()) {
      toast.error(t("admin.services.allFieldsRequired"));
      return;
    }
    createMutation.mutate({
      serviceId,
      category: category.trim(),
      name: name.trim(),
      price: Number(price),
      callMinutesLabel: callMinutesLabel.trim() || undefined,
      internetLabel: internetLabel.trim() || undefined,
      validityLabel: validityLabel.trim(),
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    });
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.services.forfaitsTitle")}
      </Typography>

      <Select
        size="small"
        displayEmpty
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
        sx={{ minWidth: 220, mb: 2 }}
      >
        <MenuItem value="">
          <em>{t("admin.services.selectServicePlaceholder")}</em>
        </MenuItem>
        {airtimeServices.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </Select>

      {airtimeServices.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {t("admin.services.noAirtimeServices")}
        </Typography>
      )}

      {serviceId && (
        <>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
            <TextField size="small" label={t("admin.services.category")} value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 140 }} />
            <TextField size="small" label={t("admin.services.name")} value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 140 }} />
            <TextField
              size="small"
              type="number"
              label={t("admin.services.price")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              sx={{ width: 130 }}
            />
            <TextField
              size="small"
              label={t("admin.services.callMinutesLabel")}
              placeholder="20 mn Tous réseaux"
              value={callMinutesLabel}
              onChange={(e) => setCallMinutesLabel(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small"
              label={t("admin.services.internetLabel")}
              placeholder="250Mo"
              value={internetLabel}
              onChange={(e) => setInternetLabel(e.target.value)}
              sx={{ minWidth: 140 }}
            />
            <TextField
              size="small"
              label={t("admin.services.validityLabel")}
              placeholder="24H"
              value={validityLabel}
              onChange={(e) => setValidityLabel(e.target.value)}
              sx={{ minWidth: 120 }}
            />
            <TextField
              size="small"
              type="number"
              label={t("admin.services.sortOrder")}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              sx={{ width: 110 }}
            />
            <Button variant="contained" disabled={createMutation.isLoading} onClick={handleCreate}>
              {t("admin.services.add")}
            </Button>
          </Box>

          {isLoading ? (
            <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
          ) : (
            (forfaits || []).map((f) => (
              <Box
                key={f.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                  px: 2,
                  mb: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {f.category} · {f.name} · {f.price} CFA
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {[f.callMinutesLabel, f.internetLabel, f.validityLabel].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
                <Switch
                  checked={f.isActive}
                  onChange={(e) => toggleMutation.mutate({ id: f.id, isActive: e.target.checked })}
                />
              </Box>
            ))
          )}
        </>
      )}
    </Box>
  );
}

function InsurancePlansSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("HEALTH");
  const [provider, setProvider] = useState("");
  const [premiumMonthly, setPremiumMonthly] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");

  const { data: plans, isLoading } = useQuery("admin-insurance-plans", fetchAdminInsurancePlans);

  const createMutation = useMutation(createAdminInsurancePlan, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-insurance-plans");
      toast.success(t("admin.services.created"));
      setName("");
      setProvider("");
      setPremiumMonthly("");
      setCoverageAmount("");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.services.saveFailed")),
  });

  const handleCreate = () => {
    if (!name.trim() || !provider.trim() || !premiumMonthly || !coverageAmount) {
      toast.error(t("admin.services.allFieldsRequired"));
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      category,
      provider: provider.trim(),
      premiumMonthly: Number(premiumMonthly),
      coverageAmount: Number(coverageAmount),
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.services.insuranceTitle")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
        <TextField size="small" label={t("admin.services.name")} value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 160 }} />
        <Select size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 130 }}>
          {["HEALTH", "AUTO", "HOME", "TRAVEL", "LIFE"].map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
        <TextField size="small" label={t("admin.services.provider")} value={provider} onChange={(e) => setProvider(e.target.value)} sx={{ minWidth: 140 }} />
        <TextField
          size="small"
          type="number"
          label={t("admin.services.premiumMonthly")}
          value={premiumMonthly}
          onChange={(e) => setPremiumMonthly(e.target.value)}
          sx={{ width: 150 }}
        />
        <TextField
          size="small"
          type="number"
          label={t("admin.services.coverageAmount")}
          value={coverageAmount}
          onChange={(e) => setCoverageAmount(e.target.value)}
          sx={{ width: 150 }}
        />
        <Button variant="contained" disabled={createMutation.isLoading} onClick={handleCreate}>
          {t("admin.services.add")}
        </Button>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (plans || []).map((p) => (
          <Box
            key={p.id}
            sx={{
              py: 1,
              px: 2,
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {p.category} · {p.provider} · {p.premiumMonthly} CFA/mo
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
}

export default function AdminServicesTab() {
  return (
    <Box>
      <MobileServicesSection />
      <Divider sx={{ my: 3 }} />
      <MobileForfaitsSection />
      <Divider sx={{ my: 3 }} />
      <InsurancePlansSection />
    </Box>
  );
}
