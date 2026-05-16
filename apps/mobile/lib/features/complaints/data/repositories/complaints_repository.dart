import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
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
    final response =
        await _apiClient.get('/complaints/$complaintId', token: token);
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

  Future<String> uploadComplaintImage({
    required String token,
    required String filePath,
    String? fileName,
  }) async {
    final resolvedName = fileName ?? _fileNameFromPath(filePath);
    final bytes = await File(filePath).readAsBytes();
    return uploadComplaintImageBytes(
      token: token,
      bytes: bytes,
      fileName: resolvedName,
    );
  }

  Future<String> uploadComplaintImageBytes({
    required String token,
    required List<int> bytes,
    required String fileName,
  }) async {
    final contentType = _contentTypeForFileName(fileName);
    final response = await _apiClient.post(
      '/uploads/sessions',
      token: token,
      body: {
        'fileName': fileName,
        'contentType': contentType,
      },
    );

    final session = _UploadSession.fromJson(response as Map<String, dynamic>);
    final uploadResponse = await http.put(
      Uri.parse(session.uploadUrl),
      headers: session.headers,
      body: bytes,
    );

    if (uploadResponse.statusCode < 200 || uploadResponse.statusCode >= 300) {
      throw ApiException(
        statusCode: uploadResponse.statusCode,
        message: 'Image upload failed',
      );
    }

    return session.publicUrl;
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

  Future<ComplaintRecord> updateStatus({
    required String token,
    required String complaintId,
    required String status,
    String? assignedAdminId,
    String? note,
  }) async {
    final response = await _apiClient.patch(
      '/complaints/$complaintId/status',
      token: token,
      body: {
        'status': status,
        if (assignedAdminId != null) 'assignedAdminId': assignedAdminId,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    return ComplaintRecord.fromJson(response as Map<String, dynamic>);
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
        String? imageUrl = item['imageUrl'] as String?;
        final localImagePath = item['localImagePath'] as String?;

        if ((imageUrl == null || imageUrl.isEmpty) &&
            localImagePath != null &&
            localImagePath.isNotEmpty) {
          if (kIsWeb) {
            throw ApiException(
              statusCode: 0,
              message: 'Queued image sync is not available on web.',
            );
          }

          final localFile = File(localImagePath);
          if (await localFile.exists()) {
            imageUrl = await uploadComplaintImage(
              token: token,
              filePath: localImagePath,
            );
          } else {
            throw ApiException(
              statusCode: 410,
              message: 'Queued image file is no longer available on device',
            );
          }
        }

        await createComplaint(
          token: token,
          description: (item['description'] ?? '') as String,
          category: (item['category'] ?? 'other') as String,
          lat: ((item['lat'] ?? 0) as num).toDouble(),
          lng: ((item['lng'] ?? 0) as num).toDouble(),
          clientRequestId: clientRequestId,
          imageUrl: imageUrl,
        );
        await queue.removeByClientRequestId(clientRequestId);
        syncedCount += 1;
      } on ApiException {
        // Leave the item queued for a later retry.
      }
    }

    return syncedCount;
  }

  String _fileNameFromPath(String path) {
    final normalized = path.replaceAll('\\', '/');
    final segments = normalized.split('/');
    final fileName = segments.isEmpty ? 'upload.jpg' : segments.last;
    return fileName.isEmpty ? 'upload.jpg' : fileName;
  }

  String _contentTypeForFileName(String fileName) {
    final normalized = fileName.toLowerCase();
    if (normalized.endsWith('.png')) {
      return 'image/png';
    }
    if (normalized.endsWith('.webp')) {
      return 'image/webp';
    }
    if (normalized.endsWith('.heic')) {
      return 'image/heic';
    }
    if (normalized.endsWith('.heif')) {
      return 'image/heif';
    }
    return 'image/jpeg';
  }
}

class _UploadSession {
  const _UploadSession({
    required this.uploadUrl,
    required this.publicUrl,
    required this.headers,
  });

  final String uploadUrl;
  final String publicUrl;
  final Map<String, String> headers;

  factory _UploadSession.fromJson(Map<String, dynamic> json) {
    final rawHeaders =
        json['headers'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    return _UploadSession(
      uploadUrl: (json['uploadUrl'] ?? '') as String,
      publicUrl: (json['publicUrl'] ?? '') as String,
      headers: rawHeaders.map(
        (key, value) => MapEntry(key, value.toString()),
      ),
    );
  }
}
