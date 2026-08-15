import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import { fetchAdminZones, createAdminZone, updateAdminZone, deleteAdminZone } from "../../api/admin";
import { MODULE_OPTIONS } from "../../constants/adminModules";
import useGoogleMaps, { GOOGLE_MAPS_API_KEY } from "../../hooks/useGoogleMaps";

function ZoneMap({ onPolygonComplete }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const status = useGoogleMaps();

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || mapInstanceRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 14.6928, lng: -17.4467 }, // Dakar
      zoom: 12,
    });
    const drawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: { editable: true },
    });
    drawingManager.setMap(map);
    window.google.maps.event.addListener(drawingManager, "polygoncomplete", (polygon) => {
      const points = polygon
        .getPath()
        .getArray()
        .map((p) => ({ lat: p.lat(), lng: p.lng() }));
      onPolygonComplete(points);
    });
    mapInstanceRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "error") {
    return <Alert severity="warning">{"Google Maps failed to load - check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."}</Alert>;
  }
  if (status !== "ready") {
    return <Alert severity="info">{"Loading map…"}</Alert>;
  }
  return <Box ref={mapRef} sx={{ height: 360, borderRadius: 2, overflow: "hidden" }} />;
}

export default function AdminZonesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [moduleKey, setModuleKey] = useState("delivery");
  const [feeMultiplier, setFeeMultiplier] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [manualJson, setManualJson] = useState("");

  const { data: zones, isLoading } = useQuery("admin-zones", () => fetchAdminZones());

  const createMutation = useMutation(createAdminZone, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-zones");
      toast.success(t("admin.zones.created"));
      setName("");
      setBoundary(null);
      setManualJson("");
    },
    onError: (err) => toast.error(err.response?.data?.message || t("admin.zones.saveFailed")),
  });

  const toggleMutation = useMutation(
    ({ id, active }) => updateAdminZone(id, { active }),
    { onSuccess: () => queryClient.invalidateQueries("admin-zones") }
  );

  const deleteMutation = useMutation(deleteAdminZone, {
    onSuccess: () => {
      queryClient.invalidateQueries("admin-zones");
      toast.success(t("admin.zones.deleted"));
    },
  });

  const handleSave = () => {
    let points = boundary;
    if (!points && manualJson.trim()) {
      try {
        points = JSON.parse(manualJson);
      } catch {
        toast.error(t("admin.zones.invalidJson"));
        return;
      }
    }
    if (!name.trim() || !points || points.length < 3) {
      toast.error(t("admin.zones.needsBoundary"));
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      moduleKey,
      boundary: points,
      feeMultiplier: feeMultiplier ? Number(feeMultiplier) : undefined,
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.zones.newZone")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          label={t("admin.zones.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <Select size="small" value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} sx={{ minWidth: 160 }}>
          {MODULE_OPTIONS.map((m) => (
            <MenuItem key={m.key} value={m.key}>
              {m.label}
            </MenuItem>
          ))}
        </Select>
        <TextField
          size="small"
          label={t("admin.zones.feeMultiplier")}
          type="number"
          value={feeMultiplier}
          onChange={(e) => setFeeMultiplier(e.target.value)}
          sx={{ width: 160 }}
        />
      </Box>

      {GOOGLE_MAPS_API_KEY ? (
        <Box sx={{ mb: 2 }}>
          <ZoneMap onPolygonComplete={setBoundary} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {boundary
              ? t("admin.zones.pointsCaptured", { count: boundary.length })
              : t("admin.zones.drawHint")}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            {t("admin.zones.noMapKey")}
          </Alert>
          <TextField
            multiline
            minRows={3}
            fullWidth
            placeholder='[{"lat":14.69,"lng":-17.44},{"lat":14.70,"lng":-17.43},{"lat":14.68,"lng":-17.45}]'
            value={manualJson}
            onChange={(e) => setManualJson(e.target.value)}
          />
        </Box>
      )}

      <Button variant="contained" disabled={createMutation.isLoading} onClick={handleSave} sx={{ mb: 3 }}>
        {t("admin.zones.save")}
      </Button>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t("admin.zones.existing")}
      </Typography>
      {isLoading ? (
        <Typography sx={{ color: "text.secondary" }}>{t("common.loading")}</Typography>
      ) : (
        (zones || []).map((z) => (
          <Box
            key={z.id}
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
              <Typography sx={{ fontWeight: 700 }}>{z.name}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {z.moduleKey} · {z.boundary.length} {t("admin.zones.points")}
                {z.feeMultiplier ? ` · ×${z.feeMultiplier}` : ""}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={z.active}
                onChange={(e) => toggleMutation.mutate({ id: z.id, active: e.target.checked })}
              />
              <IconButton size="small" onClick={() => deleteMutation.mutate(z.id)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}
