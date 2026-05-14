import 'package:flutter/material.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../data/repositories/notifications_repository.dart';
import '../../domain/models/app_notification_item.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.notificationsRepository,
    required this.sessionController,
  });

  final NotificationsRepository notificationsRepository;
  final SessionController sessionController;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<AppNotificationItem>> _notificationsFuture;

  @override
  void initState() {
    super.initState();
    _notificationsFuture = _loadNotifications();
  }

  Future<List<AppNotificationItem>> _loadNotifications() {
    return widget.notificationsRepository.listNotifications(
      widget.sessionController.accessToken!,
    );
  }

  void _reload() {
    setState(() {
      _notificationsFuture = _loadNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<AppNotificationItem>>(
        future: _notificationsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: FilledButton(
                onPressed: _reload,
                child: const Text('Reload updates'),
              ),
            );
          }

          final items = snapshot.data ?? const <AppNotificationItem>[];

          if (items.isEmpty) {
            return const Center(
              child: Text('No updates yet.'),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text('Updates', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 10),
                const Text('Status changes and complaint confirmations from the backend.'),
                const SizedBox(height: 22),
                ...items.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _NotificationTile(
                      title: item.title,
                      body: item.body,
                      time: _relativeTime(item.createdAt),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _relativeTime(DateTime timestamp) {
    final difference = DateTime.now().difference(timestamp);
    if (difference.inMinutes < 1) {
      return 'just now';
    }
    if (difference.inHours < 1) {
      return '${difference.inMinutes} min ago';
    }
    if (difference.inDays < 1) {
      return '${difference.inHours} hr ago';
    }
    return '${difference.inDays} day ago';
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.title,
    required this.body,
    required this.time,
  });

  final String title;
  final String body;
  final String time;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700))),
              Text(time, style: TextStyle(color: Colors.black.withValues(alpha: 0.55))),
            ],
          ),
          const SizedBox(height: 8),
          Text(body),
        ],
      ),
    );
  }
}
