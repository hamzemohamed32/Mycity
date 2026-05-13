import '../../../../shared/network/api_client.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/offline/offline_queue.dart';
import '../../domain/models/complaint_record.dart';

class ComplaintsRepository {
  ComplaintsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<ComplaintRecord>> listComplaints(String token) async {
    final response = await _apiClient.get('/complaints', token: token);
    final payload = response as Map<String, dynamic>;
    final items = payload['items'] as List<dynamic>? ?? const <dynamic>[];
    return items
        .map((item) => ComplaintRecord.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ComplaintRecord> getComplaint({
    required String token,
    required String complaintId,
  }) async {
    final response = await _apiClient.get('/complaints/$complaintId', token: token);
    return ComplaintRecord.fromJson(response as Map<String, dynamic>);
  }

  Future<ComplaintRecord> createComplaint({
    required String token,
    required String description,
    required String category,
    required double lat,
    required double lng,
    required String clientRequestId,
    String? imageUrl,
  }) async {
    final response = await _apiClient.post(
      '/complaints',
      token: token,
      body: {
        'description': description,
        'category': category,
        'imageUrl': imageUrl,
        'clientRequestId': clientRequestId,
        'location': {
          'lat': lat,
          'lng': lng,
        },
      },
    );

    return ComplaintRecord.fromJson(response as Map<String, dynamic>);
  }

  Future<void> addSupport({
    required String token,
    required String complaintId,
  }) async {
    await _apiClient.post(
      '/complaints/$complaintId/reactions',
      token: token,
      body: const {'type': 'support'},
    );
  }

  Future<void> addComment({
    required String token,
    required String complaintId,
    required String body,
  }) async {
    await _apiClient.post(
      '/complaints/$complaintId/comments',
      token: token,
      body: {'body': body},
    );
  }

  Future<int> syncQueuedComplaints({
    required String token,
    required OfflineComplaintQueue queue,
  }) async {
    final pending = await queue.load();
    var syncedCount = 0;

    for (final item in pending) {
      final clientRequestId = (item['clientRequestId'] ?? '') as String;
      if (clientRequestId.isEmpty) {
        continue;
      }

      try {
        await createComplaint(
          token: token,
          description: (item['description'] ?? '') as String,
          category: (item['category'] ?? 'other') as String,
          lat: ((item['lat'] ?? 0) as num).toDouble(),
          lng: ((item['lng'] ?? 0) as num).toDouble(),
          clientRequestId: clientRequestId,
          imageUrl: item['imageUrl'] as String?,
        );
        await queue.removeByClientRequestId(clientRequestId);
        syncedCount += 1;
      } on ApiException {
        // Leave the item queued for a later retry.
      }
    }

    return syncedCount;
  }
}
