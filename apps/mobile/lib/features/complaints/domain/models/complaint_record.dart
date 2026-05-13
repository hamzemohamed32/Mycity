class ComplaintRecord {
  ComplaintRecord({
    required this.id,
    required this.description,
    required this.category,
    required this.status,
    required this.supportCount,
    required this.lat,
    required this.lng,
    required this.createdAt,
    this.districtName,
    this.imageUrl,
    this.clientRequestId,
    this.comments = const <ComplaintComment>[],
  });

  final String id;
  final String description;
  final String category;
  final String status;
  final String? districtName;
  final String? imageUrl;
  final String? clientRequestId;
  final int supportCount;
  final double lat;
  final double lng;
  final DateTime createdAt;
  final List<ComplaintComment> comments;

  String get title {
    final normalized = description.trim();
    if (normalized.length <= 48) {
      return normalized;
    }

    return '${normalized.substring(0, 45)}...';
  }

  String get statusLabel => status.replaceAll('_', ' ');

  factory ComplaintRecord.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final coordinates = location['coordinates'] as List<dynamic>? ?? const <dynamic>[];
    final comments = json['comments'] as List<dynamic>? ?? const <dynamic>[];

    return ComplaintRecord(
      id: (json['id'] ?? '') as String,
      description: (json['description'] ?? '') as String,
      category: (json['category'] ?? 'other') as String,
      status: (json['status'] ?? 'pending') as String,
      districtName: (json['district'] as Map<String, dynamic>?)?['name'] as String?,
      imageUrl: json['imageUrl'] as String?,
      clientRequestId: json['clientRequestId'] as String? ??
          (json['metadata'] as Map<String, dynamic>?)?['clientRequestId'] as String?,
      supportCount: (json['supportCount'] ?? 0) as int,
      lat: coordinates.length > 1 ? (coordinates[1] as num).toDouble() : 0,
      lng: coordinates.isNotEmpty ? (coordinates[0] as num).toDouble() : 0,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '') as String) ?? DateTime.now(),
      comments: comments
          .map((item) => ComplaintComment.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ComplaintComment {
  const ComplaintComment({
    required this.authorName,
    required this.body,
    required this.createdAt,
  });

  final String authorName;
  final String body;
  final DateTime createdAt;

  factory ComplaintComment.fromJson(Map<String, dynamic> json) {
    final author = json['author'] as Map<String, dynamic>? ?? <String, dynamic>{};
    return ComplaintComment(
      authorName: (author['fullName'] ?? 'Citizen') as String,
      body: (json['body'] ?? '') as String,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '') as String) ?? DateTime.now(),
    );
  }
}
