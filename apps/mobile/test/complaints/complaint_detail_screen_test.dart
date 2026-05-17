import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/features/auth/domain/models/auth_session.dart';
import 'package:my_city_mobile/features/complaints/data/repositories/complaints_repository.dart';
import 'package:my_city_mobile/features/complaints/domain/models/complaint_record.dart';
import 'package:my_city_mobile/features/complaints/presentation/screens/complaint_detail_screen.dart';
import 'package:my_city_mobile/shared/network/api_client.dart';
import 'package:my_city_mobile/shared/storage/session/session_controller.dart';
import 'package:my_city_mobile/shared/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows complaint status, admin note, and comments',
      (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _signedInSession();
    final repository = _FakeComplaintsRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: ComplaintDetailScreen(
          complaintId: 'complaint-1',
          complaintsRepository: repository,
          sessionController: sessionController,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Street light is broken near the bus stop'), findsWidgets);
    expect(find.text('Latest city note'), findsOneWidget);
    expect(find.text('Crew assigned for evening repair'), findsOneWidget);
    expect(find.text('Location 2.04690, 45.31820'), findsOneWidget);
    expect(find.text('Neighbor'), findsOneWidget);
  });

  testWidgets('can support an issue and post a comment', (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _signedInSession();
    final repository = _FakeComplaintsRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: ComplaintDetailScreen(
          complaintId: 'complaint-1',
          complaintsRepository: repository,
          sessionController: sessionController,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Support this issue'));
    await tester.tap(find.text('Support this issue'));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byType(TextField));
    await tester.enterText(
        find.byType(TextField), 'The outage is still active.');
    await tester.ensureVisible(find.text('Post comment'));
    await tester.tap(find.text('Post comment'));
    await tester.pumpAndSettle();

    expect(repository.supportCalls, 1);
    expect(repository.commentBodies, ['The outage is still active.']);
  });
}

void _useTallTestViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(900, 1200);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

Future<SessionController> _signedInSession() async {
  SharedPreferences.setMockInitialValues({});
  final controller = SessionController();
  await controller.save(
    const AuthSession(
      userId: 'user-1',
      fullName: 'Citizen Demo',
      email: 'citizen@mycity.local',
      role: 'citizen',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    ),
  );
  return controller;
}

class _FakeComplaintsRepository extends ComplaintsRepository {
  _FakeComplaintsRepository() : super(ApiClient(baseUrl: 'http://localhost'));

  int supportCalls = 0;
  final List<String> commentBodies = [];

  @override
  Future<ComplaintRecord> getComplaint({
    required String token,
    required String complaintId,
  }) async {
    return ComplaintRecord.fromJson({
      'id': complaintId,
      'description': 'Street light is broken near the bus stop',
      'category': 'lighting',
      'status': 'in_progress',
      'district': {'name': 'Waberi'},
      'createdBy': {'fullName': 'Citizen Demo'},
      'supportCount': 7 + supportCalls,
      'location': {
        'coordinates': [45.3182, 2.0469],
      },
      'metadata': {
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
  }

  @override
  Future<void> addSupport({
    required String token,
    required String complaintId,
  }) async {
    supportCalls += 1;
  }

  @override
  Future<void> addComment({
    required String token,
    required String complaintId,
    required String body,
  }) async {
    commentBodies.add(body);
  }
}
