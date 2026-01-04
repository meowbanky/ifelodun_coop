import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

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
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
      ),
      body: Consumer<NotificationProvider>(
      builder: (context, provider, _) {
          final allNotifications = provider.notifications;
          final filtered = provider.filteredNotifications;

          return Column(
            children: [
              // Filters header (always visible so user can recover from empty filter state)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  border: Border(
                    bottom: BorderSide(
                      color: theme.colorScheme.outline.withOpacity(0.2),
                    ),
                  ),
                ),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    DropdownButton<String>(
                      isDense: true,
                      value: provider.category,
                      underline: const SizedBox(),
                      items: provider.categories
                          .map((c) => DropdownMenuItem(
                                value: c,
                                child: Text(c),
                              ))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) provider.setCategory(v);
                      },
                    ),
                    FilterChip(
                      selected: provider.showUnreadOnly,
                      onSelected: provider.setShowUnreadOnly,
                      label: const Text('Unread only'),
                    ),
                    TextButton(
                      onPressed: () {
                        provider.setCategory('All');
                        provider.setShowUnreadOnly(false);
                      },
                      child: const Text('Reset filters'),
                    ),
                    TextButton(
                      onPressed: () {
                        Provider.of<NotificationProvider>(context, listen: false)
                            .markAllAsRead();
                      },
                      child: const Text('Mark all as read'),
                    ),
                  ],
                ),
              ),

              // Content
              Expanded(
                child: Builder(builder: (_) {
                  if (allNotifications.isEmpty) {
                    // True no-data empty state
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.notifications_off_outlined,
                            size: 56,
                            color: theme.colorScheme.onSurface.withOpacity(0.4),
                          ),
                          const SizedBox(height: 10),
                          Text('No notifications yet',
                              style: theme.textTheme.titleLarge),
                          const SizedBox(height: 4),
                          if (provider.lastError != null)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20.0),
                              child: Text(
                                provider.lastError!,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: Colors.redAccent,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            )
                          else
                            Text(
                              "You're all caught up. New updates will appear here.",
                              style: theme.textTheme.bodySmall,
                              textAlign: TextAlign.center,
                            ),
                        ],
                      ),
                    );
                  }

                  if (filtered.isEmpty) {
                    // Filtered to zero
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.filter_list_off, size: 48, color: Colors.grey),
                          const SizedBox(height: 8),
                          Text('No notifications match filters',
                              style: theme.textTheme.titleMedium),
                          const SizedBox(height: 6),
                          TextButton(
                            onPressed: () {
                              provider.setCategory('All');
                              provider.setShowUnreadOnly(false);
                            },
                            child: const Text('Clear filters'),
                          ),
                        ],
                      ),
                    );
                  }

                  // Show filtered list
        return ListView.separated(
          padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
                      final n = filtered[index];
                      final isRead = n.read;
                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => provider.markAsRead(n.id),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: isRead
                                      ? theme.colorScheme.surface.withOpacity(0.6)
                                      : theme.colorScheme.primary.withOpacity(0.12),
                                  child: Icon(
                                    isRead
                                        ? Icons.notifications_none
                                        : Icons.notifications_active,
                                    color: isRead
                                        ? theme.colorScheme.onSurface.withOpacity(0.5)
                                        : theme.colorScheme.primary,
              ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              n.title,
                  style: TextStyle(
                                                fontWeight: isRead
                                                    ? FontWeight.w500
                                                    : FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                _formatDate(n.date),
                                            style: theme.textTheme.bodySmall?.copyWith(
                                              color: theme.colorScheme.onSurface.withOpacity(0.6),
                                            ),
              ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        n.body,
                                        style: theme.textTheme.bodyMedium,
                                      ),
                                    ],
                                  ),
                                )
                              ],
                            ),
                          ),
                        ),
            );
          },
        );
                }),
              ),
            ],
          );
        },
      ),
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
