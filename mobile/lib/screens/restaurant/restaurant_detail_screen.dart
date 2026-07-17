import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../models/restaurant.dart';
import '../../theme/app_theme.dart';
import '../../widgets/top_bar.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final String slug;
  const RestaurantDetailScreen({super.key, required this.slug});

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  late final Future<Restaurant> _future;

  @override
  void initState() {
    super.initState();
    _future = apiClient.fetchRestaurant(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const TopBar(title: 'Restaurant', showSearch: false, showCart: false),
      body: FutureBuilder<Restaurant>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData) {
            return const Center(child: Text('Could not load this restaurant.'));
          }
          final restaurant = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('${restaurant.cuisine ?? ''} · ${restaurant.address ?? ''}',
                  style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ...restaurant.menuItems.map((item) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                        border: Border.all(color: AppColors.divider), borderRadius: BorderRadius.circular(14)),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 56,
                            height: 56,
                            child: item.imageUrl != null
                                ? Image.network(item.imageUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(color: AppColors.background))
                                : Container(color: AppColors.background),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                              Text(formatCfa(item.price), style: const TextStyle(fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                        OutlinedButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Restaurant ordering is coming soon')),
                            );
                          },
                          child: const Text('ADD'),
                        ),
                      ],
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }
}
