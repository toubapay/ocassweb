import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import TopBar from "../../../src/components/layout/TopBar";
import useAuth from "../../../src/hooks/useAuth";
import { formatCfa } from "../../../src/utils/currency";
import { fetchWallet } from "../../../src/api/wallet";
import {
  fetchAasMetadata,
  compareAasQuotes,
  purchaseAasPolicy,
  retryAasPolicy,
  scanCarteGrise,
} from "../../../src/api/aasInsurance";

const emptyParty = { nom: "", prenom: "", cellulaire: "", email: "" };
const TOTAL_STEPS = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Thin visual progress bar under the top bar - purely a "you are here"
// cue, no text of its own to translate.
function StepProgress({ step }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, px: 2.5, pt: 1.5 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: i <= step ? "primary.main" : "#EEEEEE",
          }}
        />
      ))}
    </Box>
  );
}

// The reusable "white card on light-gray page" container this whole
// redesign is built from - every step is a stack of these.
function Card({ children, sx, ...props }) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 3,
        border: "1px solid #EEEEEE",
        p: 2.5,
        mb: 2,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

export default function AutoInsuranceCompare() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [vehicleType, setVehicleType] = useState(null); // "car" | "moto" | null
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [vehicle, setVehicle] = useState({
    genre: "",
    energie: "ESSENCE",
    periodicite: "MOIS",
    duree: 12,
    puissanceFiscale: "",
    cylindre: "",
    usage: "NON_COMMERCIAL",
    nombrePlace: "",
  });
  const [quotes, setQuotes] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [issuance, setIssuance] = useState({
    immatriculation: "",
    chassis: "",
    modele: "",
    marque: "",
    dateMiseCirculation: "",
    valeurNeuve: "",
    valeurActuelle: "",
    typePersonne: "PHYSIQUE",
  });
  const [souscripteur, setSouscripteur] = useState({ ...emptyParty, email: user?.email || "" });
  const [assure, setAssure] = useState({ ...emptyParty, email: user?.email || "" });
  const [assureSameAsSouscripteur, setAssureSameAsSouscripteur] = useState(true);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);

  const { data: metadata } = useQuery("aas-metadata", fetchAasMetadata);
  const { data: wallet } = useQuery("wallet", fetchWallet, { enabled: isAuthenticated });

  const genreEntry = useMemo(
    () => (metadata?.genres || []).find((g) => g.genre === vehicle.genre),
    [metadata, vehicle.genre]
  );
  const isMoto = genreEntry?.family === "moto";
  const supportedGenres = useMemo(() => (metadata?.genres || []).filter((g) => g.supported), [metadata]);
  const filteredGenres = useMemo(() => {
    if (!vehicleType) return supportedGenres;
    return supportedGenres.filter((g) => (vehicleType === "moto" ? g.family === "moto" : g.family !== "moto"));
  }, [supportedGenres, vehicleType]);

  const compareMutation = useMutation(compareAasQuotes, {
    onSuccess: (data) => {
      setQuotes(data);
      setStep(1);
    },
    onError: (err) => toast.error(err.response?.data?.message || t("insurance.auto.couldNotCompare")),
  });

  // Only prefills pure-identity fields (immatriculation/chassis/marque/
  // modele/dateMiseCirculation, plus optionally the subscriber's name) -
  // never puissanceFiscale/cylindre/nombrePlace/energie/genre, which were
  // already locked in for the quote the user picked. Letting a photo
  // silently change those after quoting could make the final purchase
  // price the AAS server re-computes differ from the premium the user
  // actually saw and selected.
  const scanMutation = useMutation(scanCarteGrise, {
    onSuccess: (data) => {
      const extracted = data.extracted;
      setIssuance((prev) => ({
        ...prev,
        immatriculation: extracted.immatriculation || prev.immatriculation,
        chassis: extracted.chassis || prev.chassis,
        marque: extracted.marque || prev.marque,
        modele: extracted.modele || prev.modele,
        dateMiseCirculation: extracted.dateMiseCirculation || prev.dateMiseCirculation,
      }));
      if (extracted.titulaireNom || extracted.titulairePrenom) {
        setSouscripteur((prev) => ({
          ...prev,
          nom: prev.nom || extracted.titulaireNom || "",
          prenom: prev.prenom || extracted.titulairePrenom || "",
        }));
      }
      toast.success(t("insurance.auto.scanSuccess"));
      setStep(3);
    },
    onError: (err) => {
      const data = err.response?.data;
      toast.error(data?.message || t("insurance.auto.scanFailed"));
    },
  });

  const purchaseMutation = useMutation(purchaseAasPolicy, {
    onSuccess: (data) => {
      setPurchaseResult(data.policy);
      setPurchaseError(null);
      setStep(4);
      queryClient.invalidateQueries("wallet");
      queryClient.invalidateQueries("aas-policies");
    },
    onError: (err) => {
      const data = err.response?.data;
      if (data?.policy) {
        // AAS accepted payment then failed to issue - the backend already
        // refunded the wallet. Show the honest failure, not a generic error.
        setPurchaseResult(data.policy);
        setPurchaseError(data.message);
        setStep(4);
        queryClient.invalidateQueries("wallet");
      } else {
        toast.error(data?.message || t("insurance.auto.couldNotPurchase"));
      }
    },
  });

  const retryMutation = useMutation((id) => retryAasPolicy(id), {
    onSuccess: (data) => {
      setPurchaseResult(data.policy);
      setPurchaseError(null);
      queryClient.invalidateQueries("wallet");
      queryClient.invalidateQueries("aas-policies");
    },
    onError: (err) => {
      const data = err.response?.data;
      if (data?.policy) {
        setPurchaseResult(data.policy);
        setPurchaseError(data.message);
      } else {
        toast.error(data?.message || t("insurance.auto.couldNotPurchase"));
      }
    },
  });

  if (!isAuthenticated) {
    return (
      <Box>
        <TopBar title={t("insurance.auto.title")} showCart={false} showSearch={false} />
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ mb: 2 }}>{t("common.logInToContinue")}</Typography>
          <Button variant="contained" onClick={() => router.push("/auth/login")}>
            {t("common.logIn")}
          </Button>
        </Box>
      </Box>
    );
  }

  const canCompare = vehicle.genre && vehicle.duree && (isMoto ? vehicle.cylindre !== "" && vehicle.nombrePlace : vehicle.puissanceFiscale !== "");

  const handleCompare = () => {
    const payload = {
      genre: vehicle.genre,
      energie: vehicle.energie,
      periodicite: vehicle.periodicite,
      duree: Number(vehicle.duree),
    };
    if (isMoto) {
      payload.cylindre = Number(vehicle.cylindre);
      payload.usage = vehicle.usage;
      payload.nombrePlace = Number(vehicle.nombrePlace);
    } else {
      payload.puissanceFiscale = vehicle.puissanceFiscale;
    }
    compareMutation.mutate(payload);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const mediaType = ALLOWED_IMAGE_TYPES.includes(file.type) ? file.type : "image/jpeg";
      scanMutation.mutate({ imageBase64: String(reader.result), mediaType });
    };
    reader.readAsDataURL(file);
  };

  const canPurchase =
    issuance.immatriculation &&
    issuance.chassis &&
    issuance.modele &&
    issuance.marque &&
    issuance.dateMiseCirculation &&
    (isMoto || vehicle.nombrePlace !== "") &&
    souscripteur.nom &&
    souscripteur.prenom &&
    (assureSameAsSouscripteur || (assure.nom && assure.prenom));

  const handlePurchase = () => {
    const finalAssure = assureSameAsSouscripteur ? souscripteur : assure;
    const payload = {
      genre: vehicle.genre,
      energie: vehicle.energie,
      periodicite: vehicle.periodicite,
      duree: Number(vehicle.duree),
      tier: selectedTier.tier,
      immatriculation: issuance.immatriculation,
      chassis: issuance.chassis,
      modele: issuance.modele,
      marque: issuance.marque,
      dateMiseCirculation: issuance.dateMiseCirculation,
      typePersonne: issuance.typePersonne,
      souscripteur,
      assure: finalAssure,
      nombrePlace: Number(vehicle.nombrePlace),
    };
    if (isMoto) {
      payload.cylindre = Number(vehicle.cylindre);
      payload.usage = vehicle.usage;
    } else {
      payload.puissanceFiscale = vehicle.puissanceFiscale;
      if (issuance.valeurNeuve) payload.valeurNeuve = Number(issuance.valeurNeuve);
      if (issuance.valeurActuelle) payload.valeurActuelle = Number(issuance.valeurActuelle);
    }
    purchaseMutation.mutate(payload);
  };

  const canRetry = purchaseResult?.status === "FAILED" && !purchaseResult?.linkAttestation;

  return (
    <Box sx={{ pb: 6, bgcolor: "#F7F8FA", minHeight: "100vh" }}>
      <TopBar title={t("insurance.auto.title")} showCart={false} showSearch={false} />
      <StepProgress step={step} />

      <Box sx={{ p: 2.5 }}>
        {step === 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t("insurance.auto.step1Title")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {t("insurance.auto.step1Subtitle")}
            </Typography>

            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5 }}>
              {[
                { key: "car", Icon: DirectionsCarRoundedIcon, label: t("insurance.auto.vehicleTypeCar") },
                { key: "moto", Icon: TwoWheelerRoundedIcon, label: t("insurance.auto.vehicleTypeMoto") },
              ].map((opt) => {
                const selected = vehicleType === opt.key;
                const Icon = opt.Icon;
                return (
                  <Box
                    key={opt.key}
                    onClick={() => {
                      setVehicleType(opt.key);
                      setVehicle((v) => ({ ...v, genre: "" }));
                    }}
                    sx={{
                      flex: 1,
                      textAlign: "center",
                      py: 2.5,
                      borderRadius: 3,
                      cursor: "pointer",
                      bgcolor: "background.paper",
                      border: selected ? "2px solid" : "1px solid #EEEEEE",
                      borderColor: selected ? "primary.main" : "#EEEEEE",
                    }}
                  >
                    <Icon sx={{ fontSize: 32, color: selected ? "primary.main" : "text.secondary", mb: 0.5 }} />
                    <Typography sx={{ fontWeight: 800 }}>{opt.label}</Typography>
                  </Box>
                );
              })}
            </Box>

            {vehicleType && (
              <Card>
                <TextField
                  select
                  label={t("insurance.auto.genre")}
                  fullWidth
                  value={vehicle.genre}
                  onChange={(e) => setVehicle({ ...vehicle, genre: e.target.value })}
                  sx={{ mb: 2 }}
                >
                  {filteredGenres.map((g) => (
                    <MenuItem key={g.genre} value={g.genre}>
                      {g.description} ({g.genre})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label={t("insurance.auto.energie")}
                  fullWidth
                  value={vehicle.energie}
                  onChange={(e) => setVehicle({ ...vehicle, energie: e.target.value })}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="ESSENCE">{t("insurance.auto.essence")}</MenuItem>
                  <MenuItem value="DIESEL">{t("insurance.auto.diesel")}</MenuItem>
                </TextField>

                {genreEntry && !isMoto && (
                  <TextField
                    label={t("insurance.auto.puissanceFiscale")}
                    fullWidth
                    value={vehicle.puissanceFiscale}
                    onChange={(e) => setVehicle({ ...vehicle, puissanceFiscale: e.target.value })}
                    helperText={t("insurance.auto.puissanceFiscaleHelp")}
                    sx={{ mb: 2 }}
                  />
                )}

                {genreEntry && isMoto && (
                  <>
                    <TextField
                      label={t("insurance.auto.cylindre")}
                      type="number"
                      fullWidth
                      value={vehicle.cylindre}
                      onChange={(e) => setVehicle({ ...vehicle, cylindre: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      select
                      label={t("insurance.auto.usage")}
                      fullWidth
                      value={vehicle.usage}
                      onChange={(e) => setVehicle({ ...vehicle, usage: e.target.value })}
                      sx={{ mb: 2 }}
                    >
                      <MenuItem value="NON_COMMERCIAL">{t("insurance.auto.nonCommercial")}</MenuItem>
                      <MenuItem value="COMMERCIAL">{t("insurance.auto.commercial")}</MenuItem>
                    </TextField>
                  </>
                )}

                {genreEntry && (
                  <TextField
                    label={t("insurance.auto.nombrePlace")}
                    type="number"
                    fullWidth
                    value={vehicle.nombrePlace}
                    onChange={(e) => setVehicle({ ...vehicle, nombrePlace: e.target.value })}
                  />
                )}
              </Card>
            )}

            {vehicleType && (
              <Card>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  {t("insurance.auto.duration")}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {["3", "6", "12"].map((n) => {
                    const selected = !showCustomDuration && vehicle.periodicite === "MOIS" && String(vehicle.duree) === n;
                    return (
                      <Box
                        key={n}
                        onClick={() => {
                          setShowCustomDuration(false);
                          setVehicle({ ...vehicle, periodicite: "MOIS", duree: n });
                        }}
                        sx={{
                          flex: 1,
                          textAlign: "center",
                          py: 1.5,
                          borderRadius: 2,
                          cursor: "pointer",
                          fontWeight: 800,
                          border: selected ? "2px solid" : "1px solid #EEEEEE",
                          borderColor: selected ? "primary.main" : "#EEEEEE",
                          color: selected ? "primary.main" : "text.primary",
                        }}
                      >
                        {t("insurance.auto.durationMonths", { count: Number(n) })}
                      </Box>
                    );
                  })}
                </Box>
                <Button size="small" onClick={() => setShowCustomDuration((v) => !v)} sx={{ fontWeight: 700, mt: 1.5, px: 0 }}>
                  {t("insurance.auto.customDuration")}
                </Button>
                {showCustomDuration && (
                  <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                    <TextField
                      select
                      label={t("insurance.auto.periodicite")}
                      value={vehicle.periodicite}
                      onChange={(e) => setVehicle({ ...vehicle, periodicite: e.target.value })}
                      sx={{ flex: 1 }}
                    >
                      <MenuItem value="MOIS">{t("insurance.auto.mois")}</MenuItem>
                      <MenuItem value="JOUR">{t("insurance.auto.jour")}</MenuItem>
                    </TextField>
                    <TextField
                      label={t("insurance.auto.duree")}
                      type="number"
                      value={vehicle.duree}
                      onChange={(e) => setVehicle({ ...vehicle, duree: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                )}
              </Card>
            )}

            <Button
              variant="contained"
              fullWidth
              disabled={!canCompare || compareMutation.isLoading}
              onClick={handleCompare}
              sx={{ fontWeight: 800, py: 1.25 }}
            >
              {compareMutation.isLoading ? <CircularProgress size={22} /> : t("insurance.auto.compareButton")}
            </Button>
          </Box>
        )}

        {step === 1 && quotes && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t("insurance.auto.step2Title")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {t("insurance.auto.step2Subtitle", { company: "AAS Assurances" })}
            </Typography>

            {quotes.results.map((r, i) => {
              const isRecommended = i === 1 && r.available;
              const garantieList = r.garanties.map((code) => metadata?.garantieLabels?.[code]).filter(Boolean);
              return (
                <Card
                  key={r.tier}
                  sx={{
                    opacity: r.available ? 1 : 0.6,
                    bgcolor: isRecommended ? "#E7F7EE" : "background.paper",
                    border: isRecommended ? "2px solid" : "1px solid #EEEEEE",
                    borderColor: isRecommended ? "success.main" : "#EEEEEE",
                  }}
                >
                  {isRecommended && (
                    <Chip
                      label={t("insurance.auto.recommended")}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700, mb: 1 }}
                    />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {t(`insurance.auto.tiers.${r.tier}`, { defaultValue: r.tier })}
                  </Typography>
                  {r.available ? (
                    <>
                      {garantieList.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {garantieList.map((label) => (
                            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                              <CheckRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
                              <Typography variant="body2">{label}</Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                      <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>
                        {formatCfa(r.premium)}
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => {
                          setSelectedTier(r);
                          setStep(2);
                        }}
                        sx={{ fontWeight: 700, mt: 1 }}
                      >
                        {t("insurance.auto.selectTier")}
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: "error.main", mt: 1 }}>
                      {t("insurance.auto.tierUnavailable")}: {r.message}
                    </Typography>
                  )}
                </Card>
              );
            })}

            <Button onClick={() => setStep(0)} sx={{ fontWeight: 700 }}>
              {t("insurance.auto.backToVehicle")}
            </Button>
          </Box>
        )}

        {step === 2 && selectedTier && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t("insurance.auto.photoStepTitle")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
              {t("insurance.auto.photoStepSubtitle")}
            </Typography>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFileChange}
            />

            <Button
              variant="contained"
              fullWidth
              disabled={scanMutation.isLoading}
              onClick={() => fileInputRef.current?.click()}
              startIcon={scanMutation.isLoading ? undefined : <PhotoCameraRoundedIcon />}
              sx={{ fontWeight: 800, py: 1.25, mb: 2 }}
            >
              {scanMutation.isLoading ? <CircularProgress size={22} color="inherit" /> : t("insurance.auto.takePhoto")}
            </Button>

            <Button onClick={() => setStep(3)} sx={{ fontWeight: 700 }} disabled={scanMutation.isLoading}>
              {t("insurance.auto.enterManually")}
            </Button>
          </Box>
        )}

        {step === 3 && selectedTier && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t("insurance.auto.step3Title")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {t(`insurance.auto.tiers.${selectedTier.tier}`, { defaultValue: selectedTier.tier })} - {formatCfa(selectedTier.premium)}
            </Typography>

            <Card>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {t("insurance.auto.vehicleDetails")}
              </Typography>
              <TextField
                label={t("insurance.auto.immatriculation")}
                fullWidth
                value={issuance.immatriculation}
                onChange={(e) => setIssuance({ ...issuance, immatriculation: e.target.value })}
                sx={{ mb: 1.5 }}
              />
              <TextField
                label={t("insurance.auto.chassis")}
                fullWidth
                value={issuance.chassis}
                onChange={(e) => setIssuance({ ...issuance, chassis: e.target.value })}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                <TextField
                  label={t("insurance.auto.marque")}
                  value={issuance.marque}
                  onChange={(e) => setIssuance({ ...issuance, marque: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label={t("insurance.auto.modele")}
                  value={issuance.modele}
                  onChange={(e) => setIssuance({ ...issuance, modele: e.target.value })}
                  sx={{ flex: 1 }}
                />
              </Box>
              <TextField
                label={t("insurance.auto.dateMiseCirculation")}
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={issuance.dateMiseCirculation}
                onChange={(e) => setIssuance({ ...issuance, dateMiseCirculation: e.target.value })}
                sx={{ mb: !isMoto ? 1.5 : 0 }}
              />
              {!isMoto && (
                <>
                  <TextField
                    label={t("insurance.auto.nombrePlace")}
                    type="number"
                    fullWidth
                    value={vehicle.nombrePlace}
                    onChange={(e) => setVehicle({ ...vehicle, nombrePlace: e.target.value })}
                    sx={{ mb: 1.5 }}
                  />
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <TextField
                      label={t("insurance.auto.valeurNeuve")}
                      type="number"
                      value={issuance.valeurNeuve}
                      onChange={(e) => setIssuance({ ...issuance, valeurNeuve: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label={t("insurance.auto.valeurActuelle")}
                      type="number"
                      value={issuance.valeurActuelle}
                      onChange={(e) => setIssuance({ ...issuance, valeurActuelle: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </>
              )}
            </Card>

            <Card>
              <TextField
                select
                label={t("insurance.auto.typePersonne")}
                fullWidth
                value={issuance.typePersonne}
                onChange={(e) => setIssuance({ ...issuance, typePersonne: e.target.value })}
              >
                <MenuItem value="PHYSIQUE">{t("insurance.auto.physique")}</MenuItem>
                <MenuItem value="MORALE">{t("insurance.auto.morale")}</MenuItem>
              </TextField>
            </Card>

            <Card>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {t("insurance.auto.souscripteur")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                <TextField
                  label={t("insurance.auto.nom")}
                  value={souscripteur.nom}
                  onChange={(e) => setSouscripteur({ ...souscripteur, nom: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label={t("insurance.auto.prenom")}
                  value={souscripteur.prenom}
                  onChange={(e) => setSouscripteur({ ...souscripteur, prenom: e.target.value })}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, mb: assureSameAsSouscripteur ? 0 : 1.5 }}>
                <TextField
                  label={t("insurance.auto.cellulaire")}
                  value={souscripteur.cellulaire}
                  onChange={(e) => setSouscripteur({ ...souscripteur, cellulaire: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label={t("insurance.auto.email")}
                  value={souscripteur.email}
                  onChange={(e) => setSouscripteur({ ...souscripteur, email: e.target.value })}
                  sx={{ flex: 1 }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={assureSameAsSouscripteur}
                    onChange={(e) => setAssureSameAsSouscripteur(e.target.checked)}
                  />
                }
                label={t("insurance.auto.sameAsSubscriber")}
              />

              {!assureSameAsSouscripteur && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {t("insurance.auto.assure")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                    <TextField
                      label={t("insurance.auto.nom")}
                      value={assure.nom}
                      onChange={(e) => setAssure({ ...assure, nom: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label={t("insurance.auto.prenom")}
                      value={assure.prenom}
                      onChange={(e) => setAssure({ ...assure, prenom: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <TextField
                      label={t("insurance.auto.cellulaire")}
                      value={assure.cellulaire}
                      onChange={(e) => setAssure({ ...assure, cellulaire: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label={t("insurance.auto.email")}
                      value={assure.email}
                      onChange={(e) => setAssure({ ...assure, email: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </>
              )}
            </Card>

            <Card>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {t("insurance.auto.walletBalance")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCfa(wallet?.balance || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 700 }}>{t("insurance.auto.premiumToPay")}</Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatCfa(selectedTier.premium)}</Typography>
              </Box>
            </Card>

            <Button
              variant="contained"
              fullWidth
              disabled={!canPurchase || purchaseMutation.isLoading}
              onClick={handlePurchase}
              sx={{ fontWeight: 800, py: 1.25, mb: 1 }}
            >
              {purchaseMutation.isLoading ? <CircularProgress size={22} /> : t("insurance.auto.payButton")}
            </Button>
            <Button fullWidth onClick={() => setStep(1)} sx={{ fontWeight: 700 }}>
              {t("insurance.auto.backToComparison")}
            </Button>
          </Box>
        )}

        {step === 4 && purchaseResult && (
          <Box sx={{ textAlign: "center", py: 2 }}>
            {purchaseResult.status === "ACTIVE" ? (
              <>
                <CheckCircleRoundedIcon sx={{ fontSize: 64, color: "success.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  {t("insurance.auto.success")}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                  {t("insurance.auto.successSubtitle")}
                </Typography>
                <Button
                  variant="contained"
                  href={purchaseResult.linkAttestation}
                  target="_blank"
                  rel="noopener"
                  sx={{ fontWeight: 800, mb: 1.5 }}
                >
                  {t("insurance.auto.viewAttestation")}
                </Button>
                <Box>
                  <Button onClick={() => router.push("/insurance/auto/policies")} sx={{ fontWeight: 700 }}>
                    {t("insurance.auto.viewMyPolicies")}
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <ErrorRoundedIcon sx={{ fontSize: 64, color: "error.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  {t("insurance.auto.failureTitle")}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                  {purchaseError || t("insurance.auto.failureSubtitle")}
                </Typography>
                {purchaseResult.fulfillmentError && (
                  <Typography variant="caption" sx={{ color: "error.main", display: "block", mb: 2 }}>
                    [{purchaseResult.fulfillmentErrorCode}] {purchaseResult.fulfillmentError}
                  </Typography>
                )}
                {canRetry && (
                  <Button
                    variant="contained"
                    disabled={retryMutation.isLoading}
                    onClick={() => retryMutation.mutate(purchaseResult.id)}
                    sx={{ fontWeight: 800, mb: 1.5 }}
                  >
                    {retryMutation.isLoading ? <CircularProgress size={22} /> : t("insurance.auto.retry")}
                  </Button>
                )}
                <Box>
                  <Button onClick={() => router.push("/insurance/auto/policies")} sx={{ fontWeight: 700 }}>
                    {t("insurance.auto.viewMyPolicies")}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
