import { useState } from "react";
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
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { fetchAdminUsers, updateAdminUser } from "../../api/admin";
import { getRoleColor } from "./adminRoleColors";

const ROLES = ["CUSTOMER", "VENDOR", "RESTAURANT_OWNER", "RIDER", "DELIVERY_AGENT", "ADMIN"];

export default function AdminUsersTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

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
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.users || []).map((u) => {
                  const color = getRoleColor(u.role);
                  return (
                    <TableRow key={u.id} sx={{ "&:hover": { bgcolor: "#FAFBFC" }, "& td": { borderColor: "#F1F2F5" } }}>
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
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={u.active}
                          disabled={updateMutation.isLoading}
                          onChange={(e) => updateMutation.mutate({ id: u.id, payload: { active: e.target.checked } })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
