double? _parseNullableDecimal(dynamic value) =>
    value == null ? null : double.parse(value.toString());
double _parseDecimal(dynamic value) => double.parse(value.toString());

/// One row of the AAS vehicle-genre table (server/src/constants/aasGuarantees.js) -
/// `supported` is the only field the comparison/purchase screens should
/// gate on; unsupported genres (Pool TPV / remorque / bus école) are
/// listed for reference but must never be offered for purchase.
class AasGenre {
  final String category;
  final String genre;
  final String description;
  final bool digitized;
  final String family; // "mono" | "moto" | "remorque" | "busEcole"
  final bool supported;

  AasGenre({
    required this.category,
    required this.genre,
    required this.description,
    required this.digitized,
    required this.family,
    required this.supported,
  });

  factory AasGenre.fromJson(Map<String, dynamic> json) => AasGenre(
        category: json['category'] as String,
        genre: json['genre'] as String,
        description: json['description'] as String,
        digitized: json['digitized'] as bool,
        family: json['family'] as String,
        supported: json['supported'] as bool,
      );
}

class AasPeriodiciteRange {
  final int min;
  final int max;

  AasPeriodiciteRange({required this.min, required this.max});

  factory AasPeriodiciteRange.fromJson(Map<String, dynamic> json) =>
      AasPeriodiciteRange(min: json['min'] as int, max: json['max'] as int);
}

/// GET /insurance/auto/metadata - drives the vehicle form and tier picker.
/// tiers/motoTiers map a tier name (e.g. "VOL_INCENDIE") to the list of
/// guarantee codes it buys; garantieLabels maps a guarantee code to its
/// French label, for showing what a tier actually includes.
class AasMetadata {
  final List<AasGenre> genres;
  final List<String> energies;
  final Map<String, AasPeriodiciteRange> periodicites;
  final Map<int, String> garantieLabels;
  final Map<String, List<int>> tiers;
  final Map<String, List<int>> motoTiers;

  AasMetadata({
    required this.genres,
    required this.energies,
    required this.periodicites,
    required this.garantieLabels,
    required this.tiers,
    required this.motoTiers,
  });

  factory AasMetadata.fromJson(Map<String, dynamic> json) => AasMetadata(
        genres: (json['genres'] as List<dynamic>)
            .map((g) => AasGenre.fromJson(g as Map<String, dynamic>))
            .toList(),
        energies: (json['energies'] as List<dynamic>).map((e) => e as String).toList(),
        periodicites: (json['periodicites'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, AasPeriodiciteRange.fromJson(v as Map<String, dynamic>)),
        ),
        garantieLabels: (json['garantieLabels'] as Map<String, dynamic>)
            .map((k, v) => MapEntry(int.parse(k), v as String)),
        tiers: (json['tiers'] as Map<String, dynamic>)
            .map((k, v) => MapEntry(k, (v as List<dynamic>).map((c) => c as int).toList())),
        motoTiers: (json['motoTiers'] as Map<String, dynamic>)
            .map((k, v) => MapEntry(k, (v as List<dynamic>).map((c) => c as int).toList())),
      );
}

/// One tier's live quote from POST /insurance/auto/compare. `premium` and
/// `garanties` are only meaningful when `available` is true; when false,
/// `message`/`code` explain why AAS couldn't price this tier for this
/// vehicle - never replaced with a locally-estimated number.
class AasQuoteResult {
  final String tier;
  final List<int> garanties;
  final double? premium;
  final bool available;
  final String? message;
  final String? code;

  AasQuoteResult({
    required this.tier,
    required this.garanties,
    this.premium,
    required this.available,
    this.message,
    this.code,
  });

  factory AasQuoteResult.fromJson(Map<String, dynamic> json) => AasQuoteResult(
        tier: json['tier'] as String,
        garanties: (json['garanties'] as List<dynamic>).map((c) => c as int).toList(),
        premium: _parseNullableDecimal(json['premium']),
        available: json['available'] as bool,
        message: json['message'] as String?,
        code: json['code'] as String?,
      );
}

class AasCompareResponse {
  final String companyCode;
  final String vehicleType; // "mono" | "moto"
  final String genre;
  final List<AasQuoteResult> results;

  AasCompareResponse({
    required this.companyCode,
    required this.vehicleType,
    required this.genre,
    required this.results,
  });

  factory AasCompareResponse.fromJson(Map<String, dynamic> json) => AasCompareResponse(
        companyCode: json['companyCode'] as String,
        vehicleType: json['vehicleType'] as String,
        genre: json['genre'] as String,
        results: (json['results'] as List<dynamic>)
            .map((r) => AasQuoteResult.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
}

/// souscripteur/assure - {nom, prenom, cellulaire, email}, matching the
/// backend's partySchema (aas.controller.js) exactly.
class AasParty {
  final String nom;
  final String prenom;
  final String? cellulaire;
  final String? email;

  AasParty({required this.nom, required this.prenom, this.cellulaire, this.email});

  factory AasParty.fromJson(Map<String, dynamic> json) => AasParty(
        nom: json['nom'] as String,
        prenom: json['prenom'] as String,
        cellulaire: json['cellulaire'] as String?,
        email: json['email'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'nom': nom,
        'prenom': prenom,
        if (cellulaire != null && cellulaire!.isNotEmpty) 'cellulaire': cellulaire,
        if (email != null && email!.isNotEmpty) 'email': email,
      };
}

/// InsuranceAutoPolicy - see server/prisma/schema.prisma for the full
/// field-by-field rationale (souscripteur/assure kept as JSON, garanties
/// as raw guarantee codes, premiumEstimate vs premiumCharged tracked
/// separately, etc).
class AasAutoPolicy {
  final String id;
  final String companyCode;
  final String tier;
  final String genre;
  final String energie;
  final String immatriculation;
  final String chassis;
  final String? puissanceFiscale;
  final int? cylindre;
  final int nombrePlace;
  final DateTime dateMiseCirculation;
  final String modele;
  final String marque;
  final double? valeurNeuve;
  final double? valeurActuelle;
  final String? usage;
  final String typePersonne;
  final AasParty souscripteur;
  final AasParty assure;
  final List<int> garanties;
  final String? garantiesOptPT;
  final String periodicite;
  final int duree;
  final double premiumEstimate;
  final double? premiumCharged;
  final String status; // PENDING | ISSUING | ACTIVE | FAILED | CANCELLED
  final String referenceTrxPartner;
  final int fulfillmentAttempts;
  final String? linkAttestation;
  final String? fulfillmentError;
  final String? fulfillmentErrorCode;
  final DateTime createdAt;

  AasAutoPolicy({
    required this.id,
    required this.companyCode,
    required this.tier,
    required this.genre,
    required this.energie,
    required this.immatriculation,
    required this.chassis,
    this.puissanceFiscale,
    this.cylindre,
    required this.nombrePlace,
    required this.dateMiseCirculation,
    required this.modele,
    required this.marque,
    this.valeurNeuve,
    this.valeurActuelle,
    this.usage,
    required this.typePersonne,
    required this.souscripteur,
    required this.assure,
    required this.garanties,
    this.garantiesOptPT,
    required this.periodicite,
    required this.duree,
    required this.premiumEstimate,
    this.premiumCharged,
    required this.status,
    required this.referenceTrxPartner,
    required this.fulfillmentAttempts,
    this.linkAttestation,
    this.fulfillmentError,
    this.fulfillmentErrorCode,
    required this.createdAt,
  });

  factory AasAutoPolicy.fromJson(Map<String, dynamic> json) => AasAutoPolicy(
        id: json['id'] as String,
        companyCode: json['companyCode'] as String? ?? 'AAS',
        tier: json['tier'] as String,
        genre: json['genre'] as String,
        energie: json['energie'] as String,
        immatriculation: json['immatriculation'] as String,
        chassis: json['chassis'] as String,
        puissanceFiscale: json['puissanceFiscale'] as String?,
        cylindre: json['cylindre'] as int?,
        nombrePlace: json['nombrePlace'] as int,
        dateMiseCirculation: DateTime.parse(json['dateMiseCirculation'] as String),
        modele: json['modele'] as String,
        marque: json['marque'] as String,
        valeurNeuve: _parseNullableDecimal(json['valeurNeuve']),
        valeurActuelle: _parseNullableDecimal(json['valeurActuelle']),
        usage: json['usage'] as String?,
        typePersonne: json['typePersonne'] as String,
        souscripteur: AasParty.fromJson(json['souscripteur'] as Map<String, dynamic>),
        assure: AasParty.fromJson(json['assure'] as Map<String, dynamic>),
        garanties: (json['garanties'] as List<dynamic>? ?? []).map((c) => c as int).toList(),
        garantiesOptPT: json['garantiesOptPT'] as String?,
        periodicite: json['periodicite'] as String,
        duree: json['duree'] as int,
        premiumEstimate: _parseDecimal(json['premiumEstimate']),
        premiumCharged: _parseNullableDecimal(json['premiumCharged']),
        status: json['status'] as String,
        referenceTrxPartner: json['referenceTrxPartner'] as String,
        fulfillmentAttempts: json['fulfillmentAttempts'] as int? ?? 0,
        linkAttestation: json['linkAttestation'] as String?,
        fulfillmentError: json['fulfillmentError'] as String?,
        fulfillmentErrorCode: json['fulfillmentErrorCode'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
