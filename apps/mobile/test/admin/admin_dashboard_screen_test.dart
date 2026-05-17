import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/features/admin/presentation/screens/admin_dashboard_screen.dart';
import 'package:my_city_mobile/features/auth/data/repositories/auth_repository.dart';
import 'package:my_city_mobile/features/auth/domain/models/auth_session.dart';
import 'package:my_city_mobile/features/complaints/data/repositories/complaints_repository.dart';
import 'package:my_city_mobile/features/complaints/domain/models/complaint_record.dart';
import 'package:my_city_mobile/shared/network/api_client.dart';
import 'package:my_city_mobile/shared/storage/session/session_controller.dart';
import 'package:my_city_mobile/shared/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows mayor operations overview and complaint queue',
      (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _adminSession(role: 'city_admin');
    final repository = _FakeAdminComplaintsRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: AdminDashboardScreen(
          sessionController: sessionController,
          complaintsRepository: repository,
          authRepository: _FakeAuthRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Mayor Dashboard'), findsWidgets);
    expect(find.text('Mayor operations view'), findsOneWidget);
    expect(find.text('Needs action: 2'), findsOneWidget);
    expect(find.text('Unassigned: 1'), findsOneWidget);
    expect(find.text('Broken street light'), findsWidgets);
    expect(find.text('Waste pickup missed'), findsWidgets);
  });

  testWidgets('opens management sheet and saves an admin note', (tester) async {
    _useTallTestViewport(tester);
    final sessionController = await _adminSession(role: 'district_admin');
    final repository = _FakeAdminComplaintsRepository();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: AdminDashboardScreen(
          sessionController: sessionController,
          complaintsRepository: repository,
          authRepository: _FakeAuthRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.widgetWithText(TextButton, 'Manage').first);
    await tester.tap(find.widgetWithText(TextButton, 'Manage').first);
    await tester.pumpAndSettle();

    expect(find.text('Manage complaint'), findsOneWidget);
    await tester.tap(find.text('Assign to me'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Admin note'),
      'Crew will visit today.',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Save changes'));
    await tester.pumpAndSettle();

    expect(repository.updatedStatus, 'pending');
    expect(repository.updatedNote, 'Crew will visit today.');
    expect(repository.updatedAssignedAdminId, 'admin-1');
  });
}

void _useTallTestViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(900, 1200);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

Future<SessionController> _adminSession({required String role}) async {
  SharedPreferences.setMockInitialValues({});
  final controller = SessionController();
  await controller.save(
    AuthSession(
      userId: 'admin-1',
      fullName: 'Admin Demo',
      email: 'admin@mycity.local',
      role: role,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    ),
  );
  return controller;
}

class _FakeAdminComplaintsRepository extends ComplaintsRepository {
  _FakeAdminComplaintsRepository()
      : super(ApiClient(baseUrl: 'http://localhost'));

  String? updatedStatus;
  String? updatedAssignedAdminId;
  String? updatedNote;

  @override
  Future<List<ComplaintRecord>> listComplaints(String token) async {
    return [
      ComplaintRecord.fromJson({
        'id': 'complaint-1',
        'description': 'Broken street light',
        'category': 'lighting',
        'status': 'pending',
        'district': {'name': 'Waberi'},
        'createdBy': {'fullName': 'Citizen Demo'},
        'supportCount': 12,
        'location': {
          'coordinates': [45.3182, 2.0469],
        },
        'createdAt': '2026-05-17T08:00:00.000Z',
      }),
      ComplaintRecord.fromJson({
        'id': 'complaint-2',
        'description': 'Waste pickup missed',
        'category': 'sanitation',
        'status': 'in_progress',
        'district': {'name': 'Hodan'},
        'assignedAdminId': 'admin-1',
        'supportCount': 5,
        'metadata': {'lastAdminNote': 'Truck assigned.'},
        'location': {
          'coordinates': [45.33, 2.05],
        },
        'createdAt': '2026-05-17T08:00:00.000Z',
      }),
      ComplaintRecord.fromJson({
        'id': 'complaint-3',
        'description': 'Resolved drainage issue',
        'category': 'drainage',
        'status': 'resolved',
        'district': {'name': 'Hodan'},
        'supportCount': 2,
        'location': {
          'coordinates': [45.35, 2.06],
        },
        'createdAt': '2026-05-17T08:00:00.000Z',
      }),
    ];
  }

  @override
  Future<ComplaintRecord> updateStatus({
    required String token,
    required String complaintId,
    required String status,
    String? assignedAdminId,
    String? note,
  }) async {
    updatedStatus = status;
    updatedAssignedAdminId = assignedAdminId;
    updatedNote = note;

    return ComplaintRecord.fromJson({
      'id': complaintId,
      'description': 'Broken street light',
      'category': 'lighting',
      'status': status,
      'assignedAdminId': assignedAdminId,
      'metadata': {'lastAdminNote': note},
      'supportCount': 12,
      'location': {
        'coordinates': [45.3182, 2.0469],
      },
      'createdAt': '2026-05-17T08:00:00.000Z',
    });
  }
}

class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository() : super(ApiClient(baseUrl: 'http://localhost'));
}
