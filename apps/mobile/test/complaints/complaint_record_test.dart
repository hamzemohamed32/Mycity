import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/features/complaints/domain/models/complaint_record.dart';

void main() {
  test('parses complaint API payload with map and admin fields', () {
    final complaint = ComplaintRecord.fromJson({
      'id': 'complaint-1',
      'description': 'Street light is broken near the bus stop',
      'category': 'lighting',
      'status': 'in_progress',
      'district': {'name': 'Waberi'},
      'createdBy': {
        'fullName': 'Citizen Demo',
        'email': 'citizen@mycity.local'
      },
      'assignedAdminId': 'admin-1',
      'supportCount': 7,
      'imageUrl': 'https://example.com/light.jpg',
      'location': {
        'type': 'Point',
        'coordinates': [45.3182, 2.0469],
      },
      'metadata': {
        'clientRequestId': 'local-request-1',
        'lastAdminNote': 'Crew assigned for evening repair',
      },
      'createdAt': '2026-05-17T08:00:00.000Z',
      'comments': [
        {
          'body': 'This affects the whole street.',
          'author': {'fullName': 'Neighbor'},
          'createdAt': '2026-05-17T09:00:00.000Z',
        },
      ],
    });

    expect(complaint.id, 'complaint-1');
    expect(complaint.category, 'lighting');
    expect(complaint.statusLabel, 'in progress');
    expect(complaint.districtName, 'Waberi');
    expect(complaint.createdByName, 'Citizen Demo');
    expect(complaint.assignedAdminId, 'admin-1');
    expect(complaint.adminNote, 'Crew assigned for evening repair');
    expect(complaint.clientRequestId, 'local-request-1');
    expect(complaint.supportCount, 7);
    expect(complaint.lat, 2.0469);
    expect(complaint.lng, 45.3182);
    expect(complaint.comments.single.authorName, 'Neighbor');
  });

  test('uses safe defaults for partial complaint payloads', () {
    final complaint = ComplaintRecord.fromJson({
      'id': 'complaint-2',
      'description': '',
    });

    expect(complaint.category, 'other');
    expect(complaint.status, 'pending');
    expect(complaint.supportCount, 0);
    expect(complaint.lat, 0);
    expect(complaint.lng, 0);
    expect(complaint.comments, isEmpty);
  });
}
