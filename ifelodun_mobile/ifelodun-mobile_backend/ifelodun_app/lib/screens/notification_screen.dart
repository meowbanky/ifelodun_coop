import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../models/notification.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({Key? key}) : super(key: key);

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  @override
  void initState() {
    super.initState();
    Provider.of<NotificationProvider>(context, listen: false)
        .fetchNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
      builder: (context, provider, _) {
        final notifications = provider.notifications;
        if (notifications.isEmpty) {
          return const Center(child: Text('No Notifications Yet!'));
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: notifications.length,
          separatorBuilder: (_, __) => const Divider(),
          itemBuilder: (context, index) {
            final n = notifications[index];
            return ListTile(
              leading: Icon(
                n.read ? Icons.notifications : Icons.notifications_active,
                color: n.read ? Colors.grey : Colors.blue,
              ),
              title: Text(n.title,
                  style: TextStyle(
                      fontWeight:
                          n.read ? FontWeight.normal : FontWeight.bold)),
              subtitle: Text(n.body),
              trailing: Text(
                _formatDate(n.date),
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              onTap: () => provider.markAsRead(n.id),
            );
          },
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    if (now.difference(date).inDays == 0) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
