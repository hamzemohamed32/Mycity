import '../../../../shared/network/api_client.dart';
import '../../domain/models/app_notification_item.dart';

class NotificationsRepository {
  NotificationsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<AppNotificationItem>> listNotifications(
    String token, {
    int limit = 20,
  }) async {
    final response = await _apiClient.get(
      '/notifications',
      token: token,
      queryParameters: {'limit': limit},
    );

    final items = response as List<dynamic>? ?? const <dynamic>[];
    return items
        .map((item) => AppNotificationItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
