import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { fetchAdminUsers, updateAdminUser } from "../../api/admin";

const ROLES = ["CUSTOMER", "VENDOR", "RIDER", "DELIVERY_AGENT", "ADMIN"];

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
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={t("admin.users.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 220, mb: 1.5 }}
        />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={t("admin.users.allRoles")}
            color={role === "" ? "primary" : "default"}
            variant={role === "" ? "filled" : "outlined"}
            onClick={() => setRole("")}
          />
          {ROLES.map((r) => (
            <Chip
              key={r}
              label={r}
              color={role === r ? "primary" : "default"}
              variant={role === r ? "filled" : "outlined"}
              onClick={() => setRole(r)}
            />
          ))}
        </Box>
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("admin.users.name")}</TableCell>
                <TableCell>{t("admin.users.phone")}</TableCell>
                <TableCell>{t("admin.users.role")}</TableCell>
                <TableCell align="center">{t("admin.users.active")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.users || []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name || "—"}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={u.role}
                      disabled={updateMutation.isLoading}
                      onChange={(e) =>
                        updateMutation.mutate({ id: u.id, payload: { role: e.target.value } })
                      }
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
                      onChange={(e) =>
                        updateMutation.mutate({ id: u.id, payload: { active: e.target.checked } })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
