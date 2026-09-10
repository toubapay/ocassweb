import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { fetchAdminUsers, fetchAdminUser, updateAdminUser } from "../../api/admin";
import { getRoleColor } from "./adminRoleColors";

const ROLES = ["CUSTOMER", "VENDOR", "RESTAURANT_OWNER", "RIDER", "DELIVERY_AGENT", "ADMIN"];

// Which earnings context each role's commissionSharePercent override
// applies to, purely for display copy in the management dialog - see the
// matching ROLE_COMMISSION_CONTEXT in admin.controller.js. Anando driving
// isn't role-gated (any user can post a ride), so every role also shows
// the Anando default as a secondary line rather than a context of its own.
const COMMISSION_CONTEXT_LABEL_KEY = {
  VENDOR: "admin.users.commissionContext.VENDOR",
  RESTAURANT_OWNER: "admin.users.commissionContext.RESTAURANT_OWNER",
  DELIVERY_AGENT: "admin.users.commissionContext.DELIVERY_AGENT",
  RIDER: "admin.users.commissionContext.RIDER",
};

function UserManagementDialog({ userId, initialUser, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery(["admin-user", userId], () => fetchAdminUser(userId));

  const [role, setRole] = useState(initialUser.role);
  const [active, setActive] = useState(initialUser.active);
  const [commissionMode, setCommissionMode] = useState("default");
  const [commissionValue, setCommissionValue] = useState("");

  useEffect(() => {
    if (!user) return;
    setRole(user.role);
    setActive(user.active);
    setCommissionMode(user.commissionSharePercent != null ? "custom" : "default");
    setCommissionValue(user.commissionSharePercent != null ? String(user.commissionSharePercent) : "");
  }, [user]);

  const invalidate = () => {
    queryClient.invalidateQueries("admin-users");
    queryClient.invalidateQueries(["admin-user", userId]);
  };

  const fieldMutation = useMutation((payload) => updateAdminUser(userId, payload), {
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.users.updated"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.users.updateFailed")),
  });

  const commissionMutation = useMutation((payload) => updateAdminUser(userId, payload), {
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.users.commissionUpdated"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.users.updateFailed")),
  });

  const handleSaveCommission = () => {
    if (commissionMode === "default") {
      commissionMutation.mutate({ commissionSharePercent: null });
      return;
    }
    const num = Number(commissionValue);
    if (commissionValue.trim() === "" || Number.isNaN(num) || num < 0 || num > 100) {
      toast.error(t("admin.users.commissionInvalid"));
      return;
    }
    commissionMutation.mutate({ commissionSharePercent: num });
  };

  const contextLabelKey = COMMISSION_CONTEXT_LABEL_KEY[user?.role];
  const color = getRoleColor(initialUser.role);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}1F`, color, fontWeight: 700 }}>
          {(initialUser.name || initialUser.phone?.replace(/\D/g, "") || "?").charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{initialUser.name || "—"}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 400 }}>
            {initialUser.phone}
            {initialUser.email ? ` · ${initialUser.email}` : ""}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
        {isLoading || !user ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {t("admin.users.statusAndRole")}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <Select
                  size="small"
                  value={role}
                  disabled={fieldMutation.isLoading}
                  onChange={(e) => {
                    setRole(e.target.value);
                    fieldMutation.mutate({ role: e.target.value });
                  }}
                  sx={{ minWidth: 200 }}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
                <FormControlLabel
                  control={
                    <Switch
                      checked={active}
                      disabled={fieldMutation.isLoading}
                      onChange={(e) => {
                        setActive(e.target.checked);
                        fieldMutation.mutate({ active: e.target.checked });
                      }}
                    />
                  }
                  label={active ? t("admin.users.active") : t("admin.users.suspended")}
                />
              </Box>
              {(user.store || user.restaurant) && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                  {user.store &&
                    t("admin.users.ownsStore", { name: user.store.name, status: user.store.isActive ? t("admin.users.active") : t("admin.users.suspended") })}
                  {user.restaurant &&
                    t("admin.users.ownsRestaurant", {
                      name: user.restaurant.name,
                      status: user.restaurant.isActive ? t("admin.users.active") : t("admin.users.suspended"),
                    })}
                </Typography>
              )}
              {user._count && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                  {t("admin.users.activitySummary", {
                    orders: user._count.orders,
                    deliveries: user._count.assignedDeliveries,
                    rides: user._count.assignedRides,
                    postings: user._count.ridePostings,
                  })}
                </Typography>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("admin.users.commissionTitle")}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                {t("admin.users.commissionExplainer")}
              </Typography>

              {contextLabelKey && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                  {t("admin.users.commissionDefaultForRole", {
                    percent: user.defaultCommissionSharePercent,
                    context: t(contextLabelKey),
                  })}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                {t("admin.users.commissionDefaultAnando", { percent: user.defaultAnandoDriverSharePercent })}
              </Typography>

              <RadioGroup value={commissionMode} onChange={(e) => setCommissionMode(e.target.value)}>
                <FormControlLabel value="default" control={<Radio size="small" />} label={t("admin.users.commissionUseDefault")} />
                <FormControlLabel value="custom" control={<Radio size="small" />} label={t("admin.users.commissionUseCustom")} />
              </RadioGroup>
              {commissionMode === "custom" && (
                <TextField
                  size="small"
                  type="number"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  sx={{ maxWidth: 140, mt: 1 }}
                />
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          disabled={isLoading || !user || commissionMutation.isLoading}
          onClick={handleSaveCommission}
        >
          {t("admin.users.saveCommission")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminUsersTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [managingUser, setManagingUser] = useState(null);

  const { data, isLoading } = useQuery(["admin-users", q, role], () =>
    fetchAdminUsers({ q: q || undefined, role: role || undefined })
  );

  const updateMutation = useMutation(({ id, payload }) => updateAdminUser(id, payload), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-users");
      toast.success(t("admin.users.updated"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.users.updateFailed")),
  });

  return (
    <Box>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          border: "1px solid #ECEEF1",
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          p: { xs: 2, sm: 2.5 },
          mb: 2,
        }}
      >
        <TextField
          size="small"
          placeholder={t("admin.users.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 19, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260, mb: 1.75 }}
        />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={t("admin.users.allRoles")}
            color={role === "" ? "primary" : "default"}
            variant={role === "" ? "filled" : "outlined"}
            onClick={() => setRole("")}
            sx={{ fontWeight: 600 }}
          />
          {ROLES.map((r) => (
            <Chip
              key={r}
              label={r}
              onClick={() => setRole(r)}
              variant={role === r ? "filled" : "outlined"}
              sx={{
                fontWeight: 600,
                color: role === r ? "#fff" : getRoleColor(r),
                bgcolor: role === r ? getRoleColor(r) : "transparent",
                borderColor: getRoleColor(r),
                "&:hover": { bgcolor: role === r ? getRoleColor(r) : `${getRoleColor(r)}14` },
              }}
            />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          border: "1px solid #ECEEF1",
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <Typography sx={{ color: "text.secondary", p: 3 }}>{t("common.loading")}</Typography>
        ) : (data?.users || []).length === 0 ? (
          <Typography sx={{ color: "text.secondary", p: 3 }}>—</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: "#FAFBFC", fontWeight: 700, fontSize: 12.5, color: "text.secondary", borderBottom: "1px solid #ECEEF1" } }}>
                  <TableCell>{t("admin.users.name")}</TableCell>
                  <TableCell>{t("admin.users.phone")}</TableCell>
                  <TableCell>{t("admin.users.role")}</TableCell>
                  <TableCell align="center">{t("admin.users.active")}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.users || []).map((u) => {
                  const color = getRoleColor(u.role);
                  return (
                    <TableRow
                      key={u.id}
                      onClick={() => setManagingUser(u)}
                      sx={{ cursor: "pointer", "&:hover": { bgcolor: "#FAFBFC" }, "& td": { borderColor: "#F1F2F5" } }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: `${color}1F`, color, fontSize: 13, fontWeight: 700 }}>
                            {(u.name || u.phone?.replace(/\D/g, "") || "?").charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{u.name || "—"}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>{u.phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box onClick={(e) => e.stopPropagation()}>
                          <Select
                            size="small"
                            value={u.role}
                            disabled={updateMutation.isLoading}
                            onChange={(e) => updateMutation.mutate({ id: u.id, payload: { role: e.target.value } })}
                            renderValue={(value) => (
                              <Chip
                                size="small"
                                label={value}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: 11.5,
                                  height: 22,
                                  color: getRoleColor(value),
                                  bgcolor: `${getRoleColor(value)}1A`,
                                }}
                              />
                            )}
                            sx={{
                              minWidth: 168,
                              "& .MuiOutlinedInput-notchedOutline": { border: 0 },
                              "& .MuiSelect-select": { py: 0.5 },
                            }}
                          >
                            {ROLES.map((r) => (
                              <MenuItem key={r} value={r}>
                                {r}
                              </MenuItem>
                            ))}
                          </Select>
                        </Box>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={u.active}
                          disabled={updateMutation.isLoading}
                          onChange={(e) => updateMutation.mutate({ id: u.id, payload: { active: e.target.checked } })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => setManagingUser(u)}>
                          <ChevronRightRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {managingUser && (
        <UserManagementDialog userId={managingUser.id} initialUser={managingUser} onClose={() => setManagingUser(null)} />
      )}
    </Box>
  );
}
