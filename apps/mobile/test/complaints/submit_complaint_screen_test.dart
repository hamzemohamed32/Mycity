import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/features/auth/domain/models/auth_session.dart';
import 'package:my_city_mobile/features/complaints/data/repositories/complaints_repository.dart';
import 'package:my_city_mobile/features/complaints/domain/models/complaint_record.dart';
import 'package:my_city_mobile/features/complaints/presentation/screens/submit_complaint_screen.dart';
import 'package:my_city_mobile/shared/network/api_client.dart';
import 'package:my_city_mobile/shared/network/api_exception.dart';
import 'package:my_city_mobile/shared/storage/offline/offline_queue.dart';
import 'package:my_city_mobile/shared/storage/session/session_controller.dart';
import 'package:my_city_mobile/shared/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('submits a report online and shows success state',
      (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _signedInSession();
    final offlineQueue = OfflineComplaintQueue();
    final repository = _FakeSubmitRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: SubmitComplaintScreen(
          complaintsRepository: repository,
          sessionController: sessionController,
          offlineQueue: offlineQueue,
        ),
      ),
    );
    await _pumpWorkflowFrame(tester);

    await tester.enterText(
      find.byType(TextField),
      'Water main leak near the school entrance.',
    );
    await tester.tap(find.text('Submit now'));
    await _pumpWorkflowFrame(tester);

    expect(repository.createdDescriptions,
        ['Water main leak near the school entrance.']);
    expect(repository.createdCategories, ['water']);
    expect(find.text('Report submitted'), findsOneWidget);
  });

  testWidgets('saves a report offline and shows queued count', (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _signedInSession();
    final offlineQueue = OfflineComplaintQueue();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: SubmitComplaintScreen(
          complaintsRepository: _FakeSubmitRepository(),
          sessionController: sessionController,
          offlineQueue: offlineQueue,
        ),
      ),
    );
    await _pumpWorkflowFrame(tester);

    await tester.enterText(
      find.byType(TextField),
      'Road surface has a dangerous pothole.',
    );
    await tester.tap(find.text('Save offline'));
    await _pumpWorkflowFrame(tester);

    final queued = await offlineQueue.load();
    expect(queued, hasLength(1));
    expect(
        queued.single['description'], 'Road surface has a dangerous pothole.');
    expect(find.text('Saved offline'), findsOneWidget);

    await tester.tap(find.text('Report another'));
    await _pumpWorkflowFrame(tester);

    expect(find.text('1 offline report waiting to sync.'), findsOneWidget);
  });

  testWidgets('queues a report when online submit cannot reach backend',
      (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _signedInSession();
    final offlineQueue = OfflineComplaintQueue();
    final repository = _FakeSubmitRepository(failWithNetworkError: true);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: SubmitComplaintScreen(
          complaintsRepository: repository,
          sessionController: sessionController,
          offlineQueue: offlineQueue,
        ),
      ),
    );
    await _pumpWorkflowFrame(tester);

    await tester.enterText(
      find.byType(TextField),
      'Street lights are out near the bus stop.',
    );
    await tester.tap(find.text('Submit now'));
    await _pumpWorkflowFrame(tester);

    final queued = await offlineQueue.load();
    expect(queued, hasLength(1));
    expect(queued.single['description'],
        'Street lights are out near the bus stop.');
    expect(find.text('Saved offline'), findsOneWidget);
  });
}

Future<void> _pumpWorkflowFrame(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 500));
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
  await OfflineComplaintQueue().clear();
  return controller;
}

class _FakeSubmitRepository extends ComplaintsRepository {
  _FakeSubmitRepository({this.failWithNetworkError = false})
      : super(ApiClient(baseUrl: 'http://localhost'));

  final bool failWithNetworkError;
  final List<String> createdDescriptions = [];
  final List<String> createdCategories = [];

  @override
  Future<ComplaintRecord> createComplaint({
    required String token,
    required String description,
    required String category,
    required double lat,
    required double lng,
    required String clientRequestId,
    String? imageUrl,
  }) async {
    if (failWithNetworkError) {
      throw ApiException(
        statusCode: 0,
        message: 'Unable to reach the server.',
      );
    }

    createdDescriptions.add(description);
    createdCategories.add(category);
    return ComplaintRecord.fromJson({
      'id': 'complaint-1',
      'description': description,
      'category': category,
      'status': 'pending',
      'supportCount': 0,
      'location': {
        'coordinates': [lng, lat],
      },
      'createdAt': '2026-05-17T08:00:00.000Z',
    });
  }
}
