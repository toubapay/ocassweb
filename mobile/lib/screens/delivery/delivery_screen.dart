import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/delivery_request.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  final _noteController = TextEditingController();
  bool _submitting = false;
  List<DeliveryRequest> _requests = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRequests());
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadRequests() async {
    if (!mounted || !context.read<AuthProvider>().isAuthenticated) return;
    final requests = await apiClient.fetchDeliveryRequests();
    if (mounted) setState(() => _requests = requests);
  }

  Future<void> _submit() async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Log in to request a delivery')));
      context.push('/auth/login');
      return;
    }
    if (_pickupController.text.trim().isEmpty || _dropoffController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Enter pickup and dropoff addresses')));
      return;
    }
    setState(() => _submitting = true);
    try {
      final request = await apiClient.createDeliveryRequest(
        pickupAddress: _pickupController.text.trim(),
        dropoffAddress: _dropoffController.text.trim(),
        packageNote: _noteController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Request created · estimate ${formatCfa(request.priceEstimate)}')),
      );
      _pickupController.clear();
      _dropoffController.clear();
      _noteController.clear();
      await _loadRequests();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not create request')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(title: 'Package Delivery', showBack: false, showSearch: false, showCart: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('Send a package across town',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 16),
          TextField(
              controller: _pickupController,
              decoration: const InputDecoration(labelText: 'Pickup address')),
          const SizedBox(height: 12),
          TextField(
              controller: _dropoffController,
              decoration: const InputDecoration(labelText: 'Dropoff address')),
          const SizedBox(height: 12),
          TextField(
              controller: _noteController,
              decoration: const InputDecoration(labelText: 'What are you sending? (optional)')),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style:
                  ElevatedButton.styleFrom(backgroundColor: AppColors.amber, foregroundColor: Colors.black87),
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Requesting...' : 'Get a price estimate'),
            ),
          ),
          if (_requests.isNotEmpty) ...[
            const SizedBox(height: 28),
            const Text('Your requests', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            ..._requests.map((r) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                              child: Text('${r.pickupAddress} → ${r.dropoffAddress}',
                                  style: const TextStyle(fontWeight: FontWeight.w700))),
                          Chip(label: Text(r.status), visualDensity: VisualDensity.compact),
                        ],
                      ),
                      Text('Estimate: ${formatCfa(r.priceEstimate)}',
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }
}
