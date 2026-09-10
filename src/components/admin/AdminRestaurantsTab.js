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
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { fetchAdminRestaurants, updateAdminRestaurant } from "../../api/admin";
import { AdminCard, tableHeadRowSx, tableRowHoverSx } from "./AdminUiKit";

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
      <AdminCard sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
          {t("admin.restaurants.hint")}
        </Typography>
        <TextField
          size="small"
          placeholder={t("admin.restaurants.searchPlaceholder")}
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
                  <TableCell>{t("admin.restaurants.restaurant")}</TableCell>
                  <TableCell>{t("admin.restaurants.owner")}</TableCell>
                  <TableCell align="center">{t("admin.restaurants.menuItems")}</TableCell>
                  <TableCell align="center">{t("admin.restaurants.orders")}</TableCell>
                  <TableCell align="center">{t("admin.restaurants.active")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.restaurants || []).map((restaurant) => (
                  <TableRow key={restaurant.id} sx={tableRowHoverSx}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Avatar
                          variant="rounded"
                          sx={{ width: 32, height: 32, bgcolor: "primary.light", color: "primary.dark" }}
                        >
                          <RestaurantRoundedIcon sx={{ fontSize: 17 }} />
                        </Avatar>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{restaurant.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13.5 }}>{restaurant.owner?.name || "—"}</Typography>
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
      </AdminCard>
    </Box>
  );
}
