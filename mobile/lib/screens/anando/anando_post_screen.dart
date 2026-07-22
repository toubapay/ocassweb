import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/geo.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

/// Mirrors the "post a ride" dialog in pages/anando/index.js: origin/
/// destination, an instant-availability switch (BlaBlaCar-style, driver
/// leaving right now) vs. a scheduled departure time, seat count, an
/// optional price per seat, and a note.
class AnandoPostScreen extends StatefulWidget {
  const AnandoPostScreen({super.key});

  @override
  State<AnandoPostScreen> createState() => _AnandoPostScreenState();
}

class _AnandoPostScreenState extends State<AnandoPostScreen> {
  final _originController = TextEditingController();
  final _destinationController = TextEditingController();
  final _priceController = TextEditingController();
  final _noteController = TextEditingController();
  (double, double)? _originCoords;
  bool _isInstant = false;
  DateTime? _departureAt;
  int _seats = 1;
  bool _submitting = false;

  @override
  void dispose() {
    _originController.dispose();
    _destinationController.dispose();
    _priceController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _useMyLocation() async {
    final coords = await getCurrentLatLng();
    if (!mounted) return;
    if (coords == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('delivery.locationError'))));
      return;
    }
    setState(() => _originCoords = coords);
  }

  Future<void> _pickDepartureTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(now));
    if (time == null || !mounted) return;
    setState(() {
      _departureAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _submit() async {
    if (_originController.text.trim().isEmpty || _destinationController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('anando.fillRoute'))));
      return;
    }
    if (!_isInstant && _departureAt == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('anando.chooseDeparture'))));
      return;
    }
    setState(() => _submitting = true);
    try {
      await apiClient.createPosting(
        originAddress: _originController.text.trim(),
        destinationAddress: _destinationController.text.trim(),
        originLat: _originCoords?.$1,
        originLng: _originCoords?.$2,
        isInstant: _isInstant,
        departureAt: _isInstant ? null : _departureAt,
        seatsTotal: _seats,
        pricePerSeat:
            _priceController.text.trim().isEmpty ? null : double.tryParse(_priceController.text.trim()),
        note: _noteController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('anando.published'))));
      context.pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.tr('anando.couldNotPublish'))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: TopBar(title: context.t('anando.postTitle'), showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                    controller: _originController,
                    decoration: InputDecoration(labelText: context.t('anando.origin'))),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _useMyLocation,
                tooltip: context.t('delivery.useMyLocation'),
                icon: const Icon(Icons.my_location_rounded),
                style: IconButton.styleFrom(
                  backgroundColor:
                      _originCoords != null ? AppColors.pink : AppColors.pink.withOpacity(0.15),
                  foregroundColor: _originCoords != null ? Colors.white : AppColors.pink,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _destinationController,
              decoration: InputDecoration(labelText: context.t('anando.destination'))),
          const SizedBox(height: 16),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.pink,
            value: _isInstant,
            onChanged: (v) => setState(() => _isInstant = v),
            title: Text(context.t('anando.instantSwitch'),
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          ),
          if (!_isInstant) ...[
            const SizedBox(height: 4),
            OutlinedButton.icon(
              onPressed: _pickDepartureTime,
              icon: const Icon(Icons.schedule_rounded),
              label: Text(_departureAt == null
                  ? context.t('anando.departureAt')
                  : '${_departureAt!.toLocal()}'.split('.').first),
            ),
          ],
          const SizedBox(height: 16),
          Text(context.t('anando.seats'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline_rounded),
                onPressed: () => setState(() => _seats = _seats > 1 ? _seats - 1 : 1),
              ),
              Text('$_seats', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              IconButton(
                icon: const Icon(Icons.add_circle_outline_rounded),
                onPressed: () => setState(() => _seats = _seats < 8 ? _seats + 1 : 8),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _priceController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: context.t('anando.pricePerSeat')),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            maxLines: 2,
            decoration: InputDecoration(labelText: context.t('anando.note')),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.pink),
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? context.t('anando.publishing') : context.t('anando.publish')),
            ),
          ),
        ],
      ),
    );
  }
}
