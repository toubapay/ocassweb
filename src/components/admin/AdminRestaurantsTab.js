import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { fetchAdminRestaurants, updateAdminRestaurant } from "../../api/admin";

export default function AdminRestaurantsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery(["admin-restaurants", q], () =>
    fetchAdminRestaurants({ q: q || undefined })
  );

  const updateMutation = useMutation(({ id, payload }) => updateAdminRestaurant(id, payload), {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-restaurants");
      toast.success(t("admin.restaurants.updated"));
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.restaurants.updateFailed")),
  });

  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
        {t("admin.restaurants.hint")}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={t("admin.restaurants.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Box>

      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("admin.restaurants.restaurant")}</TableCell>
                <TableCell>{t("admin.restaurants.owner")}</TableCell>
                <TableCell align="center">{t("admin.restaurants.menuItems")}</TableCell>
                <TableCell align="center">{t("admin.restaurants.orders")}</TableCell>
                <TableCell align="center">{t("admin.restaurants.active")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.restaurants || []).map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell>{restaurant.name}</TableCell>
                  <TableCell>
                    {restaurant.owner?.name || "—"}
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                      {restaurant.owner?.phone}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{restaurant._count?.menuItems ?? 0}</TableCell>
                  <TableCell align="center">{restaurant._count?.orders ?? 0}</TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={restaurant.isActive}
                      disabled={updateMutation.isLoading}
                      onChange={(e) =>
                        updateMutation.mutate({ id: restaurant.id, payload: { isActive: e.target.checked } })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.restaurants || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: "text.secondary" }}>
                    {t("admin.restaurants.none")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
