import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import TopBar from "../../../src/components/layout/TopBar";
import useAuth from "../../../src/hooks/useAuth";
import { formatCfa } from "../../../src/utils/currency";
import { fetchAasPolicies, retryAasPolicy, cancelAasPolicy } from "../../../src/api/aasInsurance";

const STATUS_COLORS = {
  ACTIVE: "success",
  ISSUING: "info",
  FAILED: "error",
  CANCELLED: "default",
  PENDING: "warning",
};

export default function MyAutoPolicies() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery("aas-policies", fetchAasPolicies, { enabled: isAuthenticated });

  const retryMutation = useMutation((id) => retryAasPolicy(id), {
    onSuccess: () => {
      toast.success(t("insurance.auto.retrySucceeded"));
      queryClient.invalidateQueries("aas-policies");
      queryClient.invalidateQueries("wallet");
    },
    onError: (err) => {
      queryClient.invalidateQueries("aas-policies");
      toast.error(err.response?.data?.message || t("insurance.auto.couldNotPurchase"));
    },
  });

  const cancelMutation = useMutation((id) => cancelAasPolicy(id), {
    onSuccess: () => {
      toast.success(t("insurance.auto.policyCancelled"));
      queryClient.invalidateQueries("aas-policies");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("insurance.auto.couldNotCancel")),
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("insurance.auto.myPolicies")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <TopBar title={t("insurance.auto.myPolicies")} showCart={false} showSearch={false} />

      <Box sx={{ p: 2 }}>
        <Button variant="outlined" fullWidth onClick={() => router.push("/insurance/auto")} sx={{ fontWeight: 700, mb: 2 }}>
          {t("insurance.auto.getNewQuote")}
        </Button>

        {isLoading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("common.loading")}
          </Typography>
        )}
        {!isLoading && (policies || []).length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("insurance.auto.noPolicies")}
          </Typography>
        )}

        {(policies || []).map((p) => (
          <Box key={p.id} sx={{ border: "1px solid #EEEEEE", borderRadius: 3, p: 2, mb: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>
                  {p.genre} - {p.immatriculation}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t(`insurance.auto.tiers.${p.tier}`, { defaultValue: p.tier })}
                </Typography>
              </Box>
              <Chip label={t(`insurance.auto.policyStatus.${p.status}`, { defaultValue: p.status })} color={STATUS_COLORS[p.status] || "default"} size="small" />
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              {formatCfa(p.premiumCharged || p.premiumEstimate)}
            </Typography>

            {p.linkAttestation && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <Link href={p.linkAttestation} target="_blank" rel="noopener">
                  {t("insurance.auto.viewAttestation")}
                </Link>
              </Typography>
            )}

            {p.fulfillmentError && (
              <Typography variant="caption" sx={{ color: "error.main", display: "block", mb: 1 }}>
                {p.fulfillmentError}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
              {p.status === "FAILED" && !p.linkAttestation && (
                <Button
                  size="small"
                  variant="outlined"
                  disabled={retryMutation.isLoading}
                  onClick={() => retryMutation.mutate(p.id)}
                  sx={{ fontWeight: 700 }}
                >
                  {retryMutation.isLoading ? <CircularProgress size={16} /> : t("insurance.auto.retry")}
                </Button>
              )}
              {p.status === "ACTIVE" && (
                <Button
                  size="small"
                  color="error"
                  disabled={cancelMutation.isLoading}
                  onClick={() => cancelMutation.mutate(p.id)}
                  sx={{ fontWeight: 700 }}
                >
                  {t("insurance.auto.cancelPolicy")}
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
