import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Switch from "@mui/material/Switch";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { fetchAdminVendors, updateAdminVendorStore } from "../../api/admin";
import { AdminCard, tableHeadRowSx, tableRowHoverSx } from "./AdminUiKit";
import { formatCfa } from "../../utils/currency";

/**
 * The commission cell.
 *
 * Edited as "what the vendor keeps", because that is the number a vendor
 * is told and the one the payout is computed from (see
 * resolveVendorShare); the platform's cut is shown underneath so nobody
 * has to do the subtraction. Left empty it clears the override and the
 * shop falls back to the platform default, which is why the placeholder
 * is that default rather than a blank - an empty box here means
 * "whatever the platform charges", not "zero".
 *
 * Saved on blur or Enter rather than per keystroke: each save is a PATCH
 * and a refetch, and a vendor's rate is not something to write 4 times
 * while someone types "92.5".
 */
function CommissionCell({ store, platformPercent, onSave, saving }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(
    store.commissionPercent != null ? String(store.commissionPercent) : ""
  );

  const commit = () => {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (Number.isNaN(next) || next < 0 || next > 100)) {
      setValue(store.commissionPercent != null ? String(store.commissionPercent) : "");
      return;
    }
    const current = store.commissionPercent != null ? Number(store.commissionPercent) : null;
    if (next === current) return;
    onSave(next);
  };

  return (
    <Box sx={{ minWidth: 132 }}>
      <TextField
        size="small"
        value={value}
        disabled={saving}
        placeholder={String(platformPercent)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        // On the input itself, not as a plain `onKeyDown` prop: TextField
        // forwards onChange/onBlur to the input but spreads anything it
        // does not recognise onto the root FormControl, so the handler
        // landed on a <div> whose blur() is a no-op - the box saved when
        // you clicked away and silently did nothing when you pressed
        // Enter, which is the one key somebody typing a rate will use.
        inputProps={{
          onKeyDown: (e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          },
        }}
        InputProps={{
          endAdornment: <InputAdornment position="end">%</InputAdornment>,
        }}
        sx={{ width: 108 }}
      />
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
        {t("admin.vendors.platformKeeps", {
          percent: Number((100 - store.effectiveSharePercent).toFixed(2)),
        })}
        {store.commissionPercent == null && ` · ${t("admin.vendors.usingDefault")}`}
      </Typography>
    </Box>
  );
}

export default function AdminVendorsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery(["admin-vendors", q], () =>
    fetchAdminVendors({ q: q || undefined })
  );

  const updateMutation = useMutation(({ id, payload }) => updateAdminVendorStore(id, payload), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-vendors");
      toast.success(t("admin.vendors.updated"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.vendors.updateFailed")),
  });

  return (
    <Box>
      <AdminCard sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
          {t("admin.vendors.hint")}
        </Typography>
        <TextField
          size="small"
          placeholder={t("admin.vendors.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 19, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260 }}
        />
      </AdminCard>

      <AdminCard sx={{ overflow: "hidden" }}>
        {isLoading ? (
          <Typography sx={{ color: "text.secondary", p: 3 }}>{t("common.loading")}</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={tableHeadRowSx}>
                  <TableCell>{t("admin.vendors.store")}</TableCell>
                  <TableCell>{t("admin.vendors.owner")}</TableCell>
                  <TableCell align="center">{t("admin.vendors.products")}</TableCell>
                  <TableCell>{t("admin.vendors.commission")}</TableCell>
                  <TableCell align="right">{t("admin.vendors.paidOut")}</TableCell>
                  <TableCell align="center">{t("admin.vendors.active")}</TableCell>
                  <TableCell align="center">{t("admin.vendors.featured")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.stores || []).map((store) => (
                  <TableRow key={store.id} sx={tableRowHoverSx}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Avatar
                          variant="rounded"
                          sx={{ width: 32, height: 32, bgcolor: "primary.light", color: "primary.dark" }}
                        >
                          <StorefrontRoundedIcon sx={{ fontSize: 17 }} />
                        </Avatar>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{store.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5 }}>{store.owner?.name || "—"}</Typography>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                        {store.owner?.phone}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{store._count?.products ?? 0}</TableCell>
                    <TableCell>
                      <CommissionCell
                        store={store}
                        platformPercent={data?.platformSharePercent ?? 85}
                        saving={updateMutation.isLoading}
                        onSave={(commissionPercent) =>
                          updateMutation.mutate({ id: store.id, payload: { commissionPercent } })
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                        {formatCfa(store.paidOutFcfa ?? 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={store.isActive}
                        disabled={updateMutation.isLoading}
                        onChange={(e) =>
                          updateMutation.mutate({ id: store.id, payload: { isActive: e.target.checked } })
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={store.isFeatured}
                        disabled={updateMutation.isLoading}
                        onChange={(e) =>
                          updateMutation.mutate({ id: store.id, payload: { isFeatured: e.target.checked } })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.stores || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: "text.secondary" }}>
                      {t("admin.vendors.none")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AdminCard>
    </Box>
  );
}
