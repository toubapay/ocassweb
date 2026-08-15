import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import TopBar from "../../src/components/layout/TopBar";
import useAuth from "../../src/hooks/useAuth";
import {
  fetchInsurancePlans,
  fetchInsurancePolicies,
  subscribeInsurancePlan,
  cancelInsurancePolicy,
} from "../../src/api/modules";
import { formatCfa } from "../../src/utils/currency";

const CATEGORIES = ["HEALTH", "AUTO", "HOME", "TRAVEL", "LIFE"];

export default function Insurance() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(0);

  const { data: plans, isLoading } = useQuery(["insurance-plans", CATEGORIES[category]], () =>
    fetchInsurancePlans(CATEGORIES[category])
  );
  const { data: policies } = useQuery("insurance-policies", fetchInsurancePolicies, {
    enabled: isAuthenticated,
  });

  const subscribeMutation = useMutation((planId) => subscribeInsurancePlan(planId), {
    onSuccess: () => {
      toast.success(t("insurance.subscribed"));
      queryClient.invalidateQueries("insurance-policies");
    },
    onError: () => toast.error(t("insurance.couldNotSubscribe")),
  });

  const cancelMutation = useMutation((id) => cancelInsurancePolicy(id), {
    onSuccess: () => {
      toast.success(t("insurance.policyCancelled"));
      queryClient.invalidateQueries("insurance-policies");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("insurance.couldNotCancel")),
  });

  const handleSubscribe = (planId) => {
    if (!isAuthenticated) {
      toast(t("insurance.loginToSubscribe"));
      router.push("/auth/login");
      return;
    }
    subscribeMutation.mutate(planId);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("insurance.title")} showBack={false} showSearch={false} showCart={false} />

      <Box sx={{ px: 1 }}>
        <Tabs
          value={category}
          onChange={(e, v) => setCategory(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {CATEGORIES.map((c) => (
            <Tab key={c} label={t(`insurance.categories.${c}`)} sx={{ fontWeight: 700, textTransform: "none" }} />
          ))}
        </Tabs>
      </Box>

      {CATEGORIES[category] === "AUTO" && (
        <Box sx={{ px: 2, pt: 2 }}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "primary.main",
              borderRadius: 3,
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <DirectionsCarRoundedIcon color="primary" sx={{ fontSize: 36 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>{t("insurance.auto.promoTitle")}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("insurance.auto.promoSubtitle")}
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => router.push("/insurance/auto")} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
              {t("insurance.auto.promoCta")}
            </Button>
          </Box>
          {isAuthenticated && (
            <Button
              size="small"
              onClick={() => router.push("/insurance/auto/policies")}
              sx={{ fontWeight: 700, mt: 1 }}
            >
              {t("insurance.auto.myPolicies")}
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("insurance.loadingPlans")}
          </Typography>
        )}
        {!isLoading && (plans || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("insurance.noPlans")}
          </Typography>
        )}
        {(plans || []).map((plan) => (
          <Box key={plan.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {plan.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {plan.provider}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
              {plan.description}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {t("insurance.perMonth", { amount: formatCfa(plan.premiumMonthly) })}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("insurance.coverageUpTo", { amount: formatCfa(plan.coverageAmount) })}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                disabled={subscribeMutation.isLoading}
                onClick={() => handleSubscribe(plan.id)}
                sx={{ fontWeight: 700 }}
              >
                {t("insurance.subscribe")}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      {isAuthenticated && (policies || []).length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            {t("insurance.myPolicies")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {policies.map((policy) => (
              <Box key={policy.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {policy.plan.name}
                  </Typography>
                  <Chip label={t(`insurance.policyStatus.${policy.status}`, { defaultValue: policy.status })} size="small" />
                </Box>
                {["PENDING", "ACTIVE"].includes(policy.status) && (
                  <Box sx={{ textAlign: "right", mt: 0.5 }}>
                    <Button
                      size="small"
                      color="error"
                      disabled={cancelMutation.isLoading}
                      onClick={() => cancelMutation.mutate(policy.id)}
                      sx={{ fontWeight: 700, minWidth: 0, p: 0 }}
                    >
                      {t("insurance.cancel")}
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
