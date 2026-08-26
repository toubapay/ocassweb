import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../models/aas_insurance.dart';
import '../../models/wallet.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors pages/insurance/auto/index.js: a 5-step Baloon-style card wizard
/// against AAS Assurances, separate from the flat insurance-plan catalog in
/// insurance_screen.dart. Step 0 picks a vehicle type then collects basics
/// and fetches metadata; step 1 shows live per-tier quotes; step 2 offers a
/// carte grise photo scan (Claude vision OCR) or manual entry; step 3
/// collects issuance/party details and charges the wallet; step 4 shows the
/// result - including the refunded-failure case (AAS accepted payment then
/// failed to issue) which must be told apart from a generic error.
const int _totalSteps = 5;

class InsuranceAutoScreen extends StatefulWidget {
  const InsuranceAutoScreen({super.key});

  @override
  State<InsuranceAutoScreen> createState() => _InsuranceAutoScreenState();
}

class _InsuranceAutoScreenState extends State<InsuranceAutoScreen> {
  int _step = 0;
  AasMetadata? _metadata;
  Wallet? _wallet;

  String? _vehicleType; // "car" | "moto"
  String _genre = '';
  String _energie = 'ESSENCE';
  String _periodicite = 'MOIS';
  final _dureeController = TextEditingController(text: '12');
  bool _showCustomDuration = false;
  final _puissanceFiscaleController = TextEditingController();
  final _cylindreController = TextEditingController();
  String _usage = 'NON_COMMERCIAL';
  final _nombrePlaceController = TextEditingController();

  AasCompareResponse? _quotes;
  bool _comparing = false;
  AasQuoteResult? _selectedTier;

  final ImagePicker _picker = ImagePicker();
  bool _scanning = false;

  final _immatriculationController = TextEditingController();
  final _chassisController = TextEditingController();
  final _modeleController = TextEditingController();
  final _marqueController = TextEditingController();
  DateTime? _dateMiseCirculation;
  final _valeurNeuveController = TextEditingController();
  final _valeurActuelleController = TextEditingController();
  String _typePersonne = 'PHYSIQUE';

  final _souscripteurNomController = TextEditingController();
  final _souscripteurPrenomController = TextEditingController();
  final _souscripteurCellulaireController = TextEditingController();
  late final TextEditingController _souscripteurEmailController;
  bool _assureSameAsSouscripteur = true;
  final _assureNomController = TextEditingController();
  final _assurePrenomController = TextEditingController();
  final _assureCellulaireController = TextEditingController();
  late final TextEditingController _assureEmailController;
  bool _purchasing = false;

  AasAutoPolicy? _purchaseResult;
  String? _purchaseError;
  bool _retrying = false;

  @override
  void initState() {
    super.initState();
    final email = context.read<AuthProvider>().user?.email ?? '';
    _souscripteurEmailController = TextEditingController(text: email);
    _assureEmailController = TextEditingController(text: email);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _dureeController.dispose();
    _puissanceFiscaleController.dispose();
    _cylindreController.dispose();
    _nombrePlaceController.dispose();
    _immatriculationController.dispose();
    _chassisController.dispose();
    _modeleController.dispose();
    _marqueController.dispose();
    _valeurNeuveController.dispose();
    _valeurActuelleController.dispose();
    _souscripteurNomController.dispose();
    _souscripteurPrenomController.dispose();
    _souscripteurCellulaireController.dispose();
    _souscripteurEmailController.dispose();
    _assureNomController.dispose();
    _assurePrenomController.dispose();
    _assureCellulaireController.dispose();
    _assureEmailController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final results = await Future.wait([
      apiClient.fetchAasMetadata(),
      apiClient.fetchWallet(),
    ]);
    if (!mounted) return;
    setState(() {
      _metadata = results[0] as AasMetadata;
      _wallet = results[1] as Wallet;
    });
  }

  AasGenre? get _genreEntry {
    final metadata = _metadata;
    if (metadata == null || _genre.isEmpty) return null;
    for (final g in metadata.genres) {
      if (g.genre == _genre) return g;
    }
    return null;
  }

  bool get _isMoto => _genreEntry?.family == 'moto';

  List<AasGenre> get _filteredGenres {
    final metadata = _metadata;
    if (metadata == null || _vehicleType == null) return const [];
    final wantFamily = _vehicleType == 'moto' ? 'moto' : 'mono';
    return metadata.genres.where((g) => g.supported && g.family == wantFamily).toList();
  }

  void _pickVehicleType(String type) {
    setState(() {
      _vehicleType = type;
      final stillValid = _filteredGenres.any((g) => g.genre == _genre);
      if (!stillValid) _genre = '';
    });
  }

  void _selectDurationPreset(int months) {
    setState(() {
      _periodicite = 'MOIS';
      _dureeController.text = '$months';
      _showCustomDuration = false;
    });
  }

  bool get _canCompare {
    if (_vehicleType == null || _genre.isEmpty || _dureeController.text.trim().isEmpty) return false;
    if (_isMoto) {
      return _cylindreController.text.trim().isNotEmpty && _nombrePlaceController.text.trim().isNotEmpty;
    }
    return _puissanceFiscaleController.text.trim().isNotEmpty;
  }

  Future<void> _compare() async {
    final duree = int.tryParse(_dureeController.text.trim());
    if (duree == null) return;
    setState(() => _comparing = true);
    final payload = <String, dynamic>{
      'genre': _genre,
      'energie': _energie,
      'periodicite': _periodicite,
      'duree': duree,
    };
    if (_isMoto) {
      payload['cylindre'] = int.tryParse(_cylindreController.text.trim()) ?? 0;
      payload['usage'] = _usage;
      payload['nombrePlace'] = int.tryParse(_nombrePlaceController.text.trim()) ?? 0;
    } else {
      payload['puissanceFiscale'] = _puissanceFiscaleController.text.trim();
    }
    try {
      final quotes = await apiClient.compareAasQuotes(payload);
      if (!mounted) return;
      setState(() {
        _quotes = quotes;
        _step = 1;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data as Map<String, dynamic>?)?['message'] as String?;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message ?? context.tr('insurance.auto.couldNotCompare'))));
    } finally {
      if (mounted) setState(() => _comparing = false);
    }
  }

  String _mediaTypeForPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  Future<void> _takePhoto() async {
    final file = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (file == null) return;
    await _scanPhoto(file);
  }

  /// Prefills only the identity fields that never feed the AAS quote
  /// (immatriculation/chassis/marque/modele/dateMiseCirculation, and the
  /// subscriber's name if blank) - never the priced fields, matching the
  /// pricing-integrity rule in scanCarteGrise (aas.controller.js) and the
  /// web scanMutation in pages/insurance/auto/index.js.
  Future<void> _scanPhoto(XFile file) async {
    setState(() => _scanning = true);
    try {
      final bytes = await file.readAsBytes();
      final mediaType = _mediaTypeForPath(file.path);
      final imageBase64 = 'data:$mediaType;base64,${base64Encode(bytes)}';
      final extracted = await apiClient.scanCarteGrise(imageBase64: imageBase64, mediaType: mediaType);
      if (!mounted) return;
      setState(() {
        if ((extracted.immatriculation ?? '').trim().isNotEmpty) {
          _immatriculationController.text = extracted.immatriculation!.trim();
        }
        if ((extracted.chassis ?? '').trim().isNotEmpty) {
          _chassisController.text = extracted.chassis!.trim();
        }
        if ((extracted.marque ?? '').trim().isNotEmpty) {
          _marqueController.text = extracted.marque!.trim();
        }
        if ((extracted.modele ?? '').trim().isNotEmpty) {
          _modeleController.text = extracted.modele!.trim();
        }
        final parsedDate =
            extracted.dateMiseCirculation == null ? null : DateTime.tryParse(extracted.dateMiseCirculation!);
        if (parsedDate != null) _dateMiseCirculation = parsedDate;
        if (_souscripteurNomController.text.trim().isEmpty && (extracted.titulaireNom ?? '').trim().isNotEmpty) {
          _souscripteurNomController.text = extracted.titulaireNom!.trim();
        }
        if (_souscripteurPrenomController.text.trim().isEmpty &&
            (extracted.titulairePrenom ?? '').trim().isNotEmpty) {
          _souscripteurPrenomController.text = extracted.titulairePrenom!.trim();
        }
        _step = 3;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('insurance.auto.scanSuccess'))));
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data as Map<String, dynamic>?)?['message'] as String?;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message ?? context.tr('insurance.auto.scanFailed'))));
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  bool get _canPurchase {
    if (_immatriculationController.text.trim().isEmpty ||
        _chassisController.text.trim().isEmpty ||
        _modeleController.text.trim().isEmpty ||
        _marqueController.text.trim().isEmpty ||
        _dateMiseCirculation == null) {
      return false;
    }
    if (!_isMoto && _nombrePlaceController.text.trim().isEmpty) return false;
    if (_souscripteurNomController.text.trim().isEmpty || _souscripteurPrenomController.text.trim().isEmpty) {
      return false;
    }
    if (!_assureSameAsSouscripteur &&
        (_assureNomController.text.trim().isEmpty || _assurePrenomController.text.trim().isEmpty)) {
      return false;
    }
    return true;
  }

  AasParty get _souscripteur => AasParty(
        nom: _souscripteurNomController.text.trim(),
        prenom: _souscripteurPrenomController.text.trim(),
        cellulaire: _souscripteurCellulaireController.text.trim(),
        email: _souscripteurEmailController.text.trim(),
      );

  AasParty get _assure => AasParty(
        nom: _assureNomController.text.trim(),
        prenom: _assurePrenomController.text.trim(),
        cellulaire: _assureCellulaireController.text.trim(),
        email: _assureEmailController.text.trim(),
      );

  Future<void> _purchase() async {
    final tier = _selectedTier;
    final dateMiseCirculation = _dateMiseCirculation;
    if (tier == null || dateMiseCirculation == null) return;
    setState(() => _purchasing = true);
    final souscripteur = _souscripteur;
    final payload = <String, dynamic>{
      'genre': _genre,
      'energie': _energie,
      'periodicite': _periodicite,
      'duree': int.tryParse(_dureeController.text.trim()) ?? 0,
      'tier': tier.tier,
      'immatriculation': _immatriculationController.text.trim(),
      'chassis': _chassisController.text.trim(),
      'modele': _modeleController.text.trim(),
      'marque': _marqueController.text.trim(),
      'dateMiseCirculation': dateMiseCirculation.toIso8601String().split('T').first,
      'typePersonne': _typePersonne,
      'souscripteur': souscripteur.toJson(),
      'assure': (_assureSameAsSouscripteur ? souscripteur : _assure).toJson(),
      'nombrePlace': int.tryParse(_nombrePlaceController.text.trim()) ?? 0,
    };
    if (_isMoto) {
      payload['cylindre'] = int.tryParse(_cylindreController.text.trim()) ?? 0;
      payload['usage'] = _usage;
    } else {
      payload['puissanceFiscale'] = _puissanceFiscaleController.text.trim();
      final valeurNeuve = _valeurNeuveController.text.trim();
      if (valeurNeuve.isNotEmpty) payload['valeurNeuve'] = double.tryParse(valeurNeuve);
      final valeurActuelle = _valeurActuelleController.text.trim();
      if (valeurActuelle.isNotEmpty) payload['valeurActuelle'] = double.tryParse(valeurActuelle);
    }
    try {
      final policy = await apiClient.purchaseAasPolicy(payload);
      if (!mounted) return;
      setState(() {
        _purchaseResult = policy;
        _purchaseError = null;
        _step = 4;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final data = e.response?.data as Map<String, dynamic>?;
      final policyJson = data?['policy'] as Map<String, dynamic>?;
      if (policyJson != null) {
        // AAS accepted payment then failed to issue - the backend already
        // refunded the wallet. Show the honest failure, not a generic error.
        setState(() {
          _purchaseResult = AasAutoPolicy.fromJson(policyJson);
          _purchaseError = data?['message'] as String?;
          _step = 4;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text((data?['message'] as String?) ?? context.tr('insurance.auto.couldNotPurchase'))));
      }
    } finally {
      if (mounted) setState(() => _purchasing = false);
    }
  }

  Future<void> _retry() async {
    final policy = _purchaseResult;
    if (policy == null) return;
    setState(() => _retrying = true);
    try {
      final updated = await apiClient.retryAasPolicy(policy.id);
      if (!mounted) return;
      setState(() {
        _purchaseResult = updated;
        _purchaseError = null;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final data = e.response?.data as Map<String, dynamic>?;
      final policyJson = data?['policy'] as Map<String, dynamic>?;
      if (policyJson != null) {
        setState(() {
          _purchaseResult = AasAutoPolicy.fromJson(policyJson);
          _purchaseError = data?['message'] as String?;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text((data?['message'] as String?) ?? context.tr('insurance.auto.couldNotPurchase'))));
      }
    } finally {
      if (mounted) setState(() => _retrying = false);
    }
  }

  Future<void> _pickDateMiseCirculation() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _dateMiseCirculation ?? now,
      firstDate: DateTime(1980),
      lastDate: now,
    );
    if (date != null) setState(() => _dateMiseCirculation = date);
  }

  @override
  Widget build(BuildContext context) {
    final authenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!authenticated) {
      return Scaffold(
        appBar: TopBar(title: context.t('insurance.auto.title'), showCart: false, showSearch: false),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(context.t('common.logInToContinue'), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.push('/auth/login'),
                  child: Text(context.t('common.logIn')),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: TopBar(title: context.t('insurance.auto.title'), showCart: false, showSearch: false),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: _buildStepProgress(),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _buildStep(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepProgress() {
    return Row(
      children: List.generate(_totalSteps, (i) {
        final active = i <= _step;
        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: i == _totalSteps - 1 ? 0 : 4),
            decoration: BoxDecoration(
              color: active ? AppColors.green : AppColors.divider,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }

  Widget _card({required Widget child}) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.divider),
        ),
        child: child,
      );

  Widget _buildStep(BuildContext context) {
    switch (_step) {
      case 0:
        return _buildVehicleStep(context);
      case 1:
        return _buildQuotesStep(context);
      case 2:
        return _buildPhotoStep(context);
      case 3:
        return _buildIssuanceStep(context);
      default:
        return _buildResultStep(context);
    }
  }

  Widget _buildVehicleTypeCard({required String type, required IconData icon, required String label}) {
    final selected = _vehicleType == type;
    return Expanded(
      child: InkWell(
        onTap: () => _pickVehicleType(type),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: selected ? AppColors.greenSoft : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? AppColors.green : AppColors.divider, width: selected ? 2 : 1),
          ),
          child: Column(
            children: [
              Icon(icon, size: 32, color: selected ? AppColors.green : AppColors.textSecondary),
              const SizedBox(height: 8),
              Text(label,
                  style: TextStyle(
                      fontWeight: FontWeight.w700, color: selected ? AppColors.green : AppColors.textPrimary)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDurationChip(int months, {bool last = false}) {
    final selected = !_showCustomDuration && _periodicite == 'MOIS' && _dureeController.text.trim() == '$months';
    return Expanded(
      child: InkWell(
        onTap: () => _selectDurationPreset(months),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          margin: EdgeInsets.only(right: last ? 0 : 8),
          decoration: BoxDecoration(
            color: selected ? AppColors.greenSoft : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: selected ? AppColors.green : AppColors.divider, width: selected ? 2 : 1),
          ),
          child: Center(
            child: Text(
              context.tPlural('insurance.auto.durationMonths', months),
              style: TextStyle(
                  fontWeight: FontWeight.w700, color: selected ? AppColors.green : AppColors.textPrimary),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVehicleStep(BuildContext context) {
    final metadata = _metadata;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.t('insurance.auto.step1Title'),
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 4),
        Text(context.t('insurance.auto.step1Subtitle'),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 16),
        if (metadata == null)
          const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
        else ...[
          Row(
            children: [
              _buildVehicleTypeCard(
                  type: 'car', icon: Icons.directions_car_rounded, label: context.t('insurance.auto.vehicleTypeCar')),
              const SizedBox(width: 12),
              _buildVehicleTypeCard(
                  type: 'moto',
                  icon: Icons.two_wheeler_rounded,
                  label: context.t('insurance.auto.vehicleTypeMoto')),
            ],
          ),
          if (_vehicleType != null) ...[
            const SizedBox(height: 16),
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    value: _genre.isEmpty ? null : _genre,
                    decoration: InputDecoration(labelText: context.t('insurance.auto.genre')),
                    items: _filteredGenres
                        .map((g) => DropdownMenuItem(value: g.genre, child: Text('${g.description} (${g.genre})')))
                        .toList(),
                    onChanged: (v) => setState(() => _genre = v ?? ''),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _energie,
                    decoration: InputDecoration(labelText: context.t('insurance.auto.energie')),
                    items: [
                      DropdownMenuItem(value: 'ESSENCE', child: Text(context.t('insurance.auto.essence'))),
                      DropdownMenuItem(value: 'DIESEL', child: Text(context.t('insurance.auto.diesel'))),
                    ],
                    onChanged: (v) => setState(() => _energie = v ?? 'ESSENCE'),
                  ),
                  if (_genreEntry != null && !_isMoto) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _puissanceFiscaleController,
                      decoration: InputDecoration(
                        labelText: context.t('insurance.auto.puissanceFiscale'),
                        helperText: context.t('insurance.auto.puissanceFiscaleHelp'),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ],
                  if (_genreEntry != null && _isMoto) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _cylindreController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.cylindre')),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _usage,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.usage')),
                      items: [
                        DropdownMenuItem(
                            value: 'NON_COMMERCIAL', child: Text(context.t('insurance.auto.nonCommercial'))),
                        DropdownMenuItem(value: 'COMMERCIAL', child: Text(context.t('insurance.auto.commercial'))),
                      ],
                      onChanged: (v) => setState(() => _usage = v ?? 'NON_COMMERCIAL'),
                    ),
                  ],
                  if (_genreEntry != null) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _nombrePlaceController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.nombrePlace')),
                      onChanged: (_) => setState(() {}),
                    ),
                  ],
                ],
              ),
            ),
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.t('insurance.auto.duration'), style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildDurationChip(3),
                      _buildDurationChip(6),
                      _buildDurationChip(12, last: true),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft),
                    onPressed: () => setState(() => _showCustomDuration = !_showCustomDuration),
                    child: Text(context.t('insurance.auto.customDuration')),
                  ),
                  if (_showCustomDuration) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _periodicite,
                            decoration: InputDecoration(labelText: context.t('insurance.auto.periodicite')),
                            items: [
                              DropdownMenuItem(value: 'MOIS', child: Text(context.t('insurance.auto.mois'))),
                              DropdownMenuItem(value: 'JOUR', child: Text(context.t('insurance.auto.jour'))),
                            ],
                            onChanged: (v) => setState(() => _periodicite = v ?? 'MOIS'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _dureeController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(labelText: context.t('insurance.auto.duree')),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _canCompare && !_comparing ? _compare : null,
                child: Text(_comparing ? context.t('common.loading') : context.t('insurance.auto.compareButton')),
              ),
            ),
          ],
        ],
      ],
    );
  }

  Widget _buildQuotesStep(BuildContext context) {
    final quotes = _quotes;
    if (quotes == null) return const SizedBox.shrink();
    final metadata = _metadata;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.t('insurance.auto.step2Title'),
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 4),
        Text(context.t('insurance.auto.step2Subtitle', {'company': 'AAS Assurances'}),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 16),
        ...quotes.results.asMap().entries.map((entry) {
          final index = entry.key;
          final r = entry.value;
          final recommended = index == 1;
          final labels = r.garanties.map((code) => metadata?.garantieLabels[code]).whereType<String>().toList();
          return Opacity(
            opacity: r.available ? 1 : 0.6,
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: recommended ? AppColors.greenSoft : Colors.white,
                border: Border.all(color: recommended ? AppColors.green : AppColors.divider, width: recommended ? 2 : 1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (recommended) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.green, borderRadius: BorderRadius.circular(999)),
                      child: Text(context.t('insurance.auto.recommended'),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(context.tOr('insurance.auto.tiers.${r.tier}', r.tier),
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  if (labels.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    ...labels.map((label) => Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Row(
                            children: [
                              const Icon(Icons.check_rounded, size: 16, color: AppColors.green),
                              const SizedBox(width: 6),
                              Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
                            ],
                          ),
                        )),
                  ],
                  if (r.available) ...[
                    const SizedBox(height: 8),
                    Text(formatCfa(r.premium), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => setState(() {
                          _selectedTier = r;
                          _step = 2;
                        }),
                        child: Text(context.t('insurance.auto.selectTier')),
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    Text('${context.t('insurance.auto.tierUnavailable')}: ${r.message ?? ''}',
                        style: const TextStyle(color: AppColors.red)),
                  ],
                ],
              ),
            ),
          );
        }),
        TextButton(
          onPressed: () => setState(() => _step = 0),
          child: Text(context.t('insurance.auto.backToVehicle')),
        ),
      ],
    );
  }

  Widget _buildPhotoStep(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 12),
        Text(context.t('insurance.auto.photoStepTitle'),
            textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 4),
        Text(context.t('insurance.auto.photoStepSubtitle'),
            textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _scanning ? null : _takePhoto,
            icon: _scanning
                ? const SizedBox(
                    width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.camera_alt_rounded),
            label: Text(context.t('insurance.auto.takePhoto')),
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: _scanning ? null : () => setState(() => _step = 3),
          child: Text(context.t('insurance.auto.enterManually')),
        ),
      ],
    );
  }

  Widget _buildIssuanceStep(BuildContext context) {
    final tier = _selectedTier;
    if (tier == null) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.t('insurance.auto.step3Title'),
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 4),
        Text('${context.tOr('insurance.auto.tiers.${tier.tier}', tier.tier)} - ${formatCfa(tier.premium)}',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 16),
        _card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(context.t('insurance.auto.vehicleDetails'), style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              TextField(
                controller: _immatriculationController,
                decoration: InputDecoration(labelText: context.t('insurance.auto.immatriculation')),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _chassisController,
                decoration: InputDecoration(labelText: context.t('insurance.auto.chassis')),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _marqueController,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.marque')),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _modeleController,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.modele')),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickDateMiseCirculation,
                child: InputDecorator(
                  decoration: InputDecoration(labelText: context.t('insurance.auto.dateMiseCirculation')),
                  child: Text(_dateMiseCirculation == null
                      ? ''
                      : _dateMiseCirculation!.toIso8601String().split('T').first),
                ),
              ),
              if (!_isMoto) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: _nombrePlaceController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: context.t('insurance.auto.nombrePlace')),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _valeurNeuveController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: context.t('insurance.auto.valeurNeuve')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _valeurActuelleController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: context.t('insurance.auto.valeurActuelle')),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _typePersonne,
                decoration: InputDecoration(labelText: context.t('insurance.auto.typePersonne')),
                items: [
                  DropdownMenuItem(value: 'PHYSIQUE', child: Text(context.t('insurance.auto.physique'))),
                  DropdownMenuItem(value: 'MORALE', child: Text(context.t('insurance.auto.morale'))),
                ],
                onChanged: (v) => setState(() => _typePersonne = v ?? 'PHYSIQUE'),
              ),
            ],
          ),
        ),
        _card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(context.t('insurance.auto.souscripteur'), style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _souscripteurNomController,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.nom')),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _souscripteurPrenomController,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.prenom')),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _souscripteurCellulaireController,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.cellulaire')),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _souscripteurEmailController,
                      decoration: InputDecoration(labelText: context.t('insurance.auto.email')),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              CheckboxListTile(
                value: _assureSameAsSouscripteur,
                onChanged: (v) => setState(() => _assureSameAsSouscripteur = v ?? true),
                title: Text(context.t('insurance.auto.sameAsSubscriber')),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
              ),
              if (!_assureSameAsSouscripteur) ...[
                Text(context.t('insurance.auto.assure'), style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _assureNomController,
                        decoration: InputDecoration(labelText: context.t('insurance.auto.nom')),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _assurePrenomController,
                        decoration: InputDecoration(labelText: context.t('insurance.auto.prenom')),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _assureCellulaireController,
                        decoration: InputDecoration(labelText: context.t('insurance.auto.cellulaire')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _assureEmailController,
                        decoration: InputDecoration(labelText: context.t('insurance.auto.email')),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        _card(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(context.t('insurance.auto.walletBalance'),
                      style: const TextStyle(color: AppColors.textSecondary)),
                  Text(formatCfa(_wallet?.balance ?? 0), style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(context.t('insurance.auto.premiumToPay'), style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(formatCfa(tier.premium), style: const TextStyle(fontWeight: FontWeight.w800)),
                ],
              ),
            ],
          ),
        ),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _canPurchase && !_purchasing ? _purchase : null,
            child: Text(_purchasing ? context.t('common.loading') : context.t('insurance.auto.payButton')),
          ),
        ),
        TextButton(
          onPressed: () => setState(() => _step = 1),
          child: Text(context.t('insurance.auto.backToComparison')),
        ),
      ],
    );
  }

  Widget _buildResultStep(BuildContext context) {
    final result = _purchaseResult;
    if (result == null) return const SizedBox.shrink();
    final canRetry = result.status == 'FAILED' && result.linkAttestation == null;

    return Center(
      child: Column(
        children: [
          const SizedBox(height: 12),
          Icon(
            result.status == 'ACTIVE' ? Icons.check_circle_rounded : Icons.error_rounded,
            size: 64,
            color: result.status == 'ACTIVE' ? AppColors.green : AppColors.red,
          ),
          const SizedBox(height: 8),
          Text(
            result.status == 'ACTIVE'
                ? context.t('insurance.auto.success')
                : context.t('insurance.auto.failureTitle'),
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 8),
          Text(
            result.status == 'ACTIVE'
                ? context.t('insurance.auto.successSubtitle')
                : (_purchaseError ?? context.t('insurance.auto.failureSubtitle')),
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          if (result.status != 'ACTIVE' && result.fulfillmentError != null) ...[
            const SizedBox(height: 8),
            Text('[${result.fulfillmentErrorCode ?? ''}] ${result.fulfillmentError}',
                textAlign: TextAlign.center, style: const TextStyle(color: AppColors.red, fontSize: 12)),
          ],
          const SizedBox(height: 20),
          if (result.status == 'ACTIVE' && result.linkAttestation != null)
            ElevatedButton(
              onPressed: () => launchUrl(Uri.parse(result.linkAttestation!), mode: LaunchMode.externalApplication),
              child: Text(context.t('insurance.auto.viewAttestation')),
            ),
          if (canRetry)
            ElevatedButton(
              onPressed: _retrying ? null : _retry,
              child: Text(_retrying ? context.t('common.loading') : context.t('insurance.auto.retry')),
            ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => context.push('/insurance/auto/policies'),
            child: Text(context.t('insurance.auto.viewMyPolicies')),
          ),
        ],
      ),
    );
  }
}
