import 'package:flutter/material.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';

class DeviceManagementScreen extends StatefulWidget {
  const DeviceManagementScreen({super.key});

  @override
  State<DeviceManagementScreen> createState() => _DeviceManagementScreenState();
}

class _DeviceManagementScreenState extends State<DeviceManagementScreen> {
  // Placeholder devices; wire to provider/API later
  final List<Map<String, dynamic>> _devices = [
    {
      'name': 'iPhone 14 Pro',
      'platform': 'iOS',
      'lastSeen': '2025-10-28 14:21',
      'active': true,
    },
    {
      'name': 'Pixel 7',
      'platform': 'Android',
      'lastSeen': '2025-10-20 09:05',
      'active': false,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Devices')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _devices.length,
        itemBuilder: (context, index) {
          final d = _devices[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AppCard(
              child: Row(
                children: [
                CircleAvatar(
                  radius: 22,
                  child: Icon(d['platform'] == 'iOS' ? Icons.phone_iphone : Icons.android),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(d['name'], style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text('Last seen: ${d['lastSeen']}',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: Theme.of(context).hintColor)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                AppButton(
                  onPressed: () async {
                    // TODO: Wire to revoke device token endpoint
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Revoked ${d['name']} (placeholder)')),
                    );
                    setState(() => d['active'] = false);
                  },
                  expanded: false,
                  leadingIcon: Icons.link_off,
                  child: const Text('Revoke'),
                ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}


