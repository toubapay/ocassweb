import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

const Map<String, Color> _statusColors = {
  'PENDING': AppColors.amber,
  'CONFIRMED': AppColors.blue,
  'PREPARING': AppColors.blue,
  'OUT_FOR_DELIVERY': AppColors.blue,
  'DELIVERED': AppColors.green,
  'CANCELLED': AppColors.red,
};

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  Future<List<Order>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (context.read<AuthProvider>().isAuthenticated) {
      _future ??= apiClient.fetchOrders();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = context.watch<AuthProvider>().isAuthenticated;

    if (!isAuthenticated) {
      return Scaffold(
        appBar: const TopBar(title: 'Your orders', showCart: false, showSearch: false, showBack: false),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Log in to see your orders.'),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => context.push('/auth/login'), child: const Text('Log in')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: const TopBar(title: 'Your orders', showCart: false, showSearch: false, showBack: false),
      body: FutureBuilder<List<Order>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final orders = snapshot.data ?? const <Order>[];
          if (orders.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('No orders yet.'),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: () => context.go('/ecommerce'), child: const Text('Start shopping')),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: orders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final order = orders[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.divider),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Order #${order.id.substring(0, 8)}',
                            style: const TextStyle(fontWeight: FontWeight.w700)),
                        Chip(
                          label: Text(order.status.replaceAll('_', ' '),
                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                          backgroundColor: _statusColors[order.status] ?? AppColors.textSecondary,
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    Text(order.createdAt.toLocal().toString(),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    const SizedBox(height: 8),
                    ...order.items.map((item) => Text('${item.quantity} x ${item.product.name}',
                        style: const TextStyle(color: AppColors.textSecondary))),
                    const SizedBox(height: 8),
                    Text('Total: ${formatCfa(order.total)}',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
