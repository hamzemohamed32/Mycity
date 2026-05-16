import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/features/auth/data/repositories/auth_repository.dart';
import 'package:my_city_mobile/features/auth/domain/models/auth_session.dart';
import 'package:my_city_mobile/features/auth/presentation/screens/sign_in_screen.dart';
import 'package:my_city_mobile/shared/network/api_client.dart';
import 'package:my_city_mobile/shared/storage/session/session_controller.dart';
import 'package:my_city_mobile/shared/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('toggles between sign in and create account modes',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final sessionController = SessionController();
    await sessionController.restore();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: SignInScreen(
          authRepository: _FakeAuthRepository(),
          sessionController: sessionController,
        ),
      ),
    );

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Full name'), findsNothing);

    await tester.tap(find.text('Need an account? Create one'));
    await tester.pumpAndSettle();

    expect(find.text('Create account'), findsWidgets);
    expect(find.text('Full name'), findsOneWidget);
  });

  testWidgets('shows validation when required fields are missing',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final sessionController = SessionController();
    await sessionController.restore();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: SignInScreen(
          authRepository: _FakeAuthRepository(),
          sessionController: sessionController,
        ),
      ),
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pump();

    expect(find.text('Complete the required fields.'), findsOneWidget);
  });

  testWidgets('saves a session after successful sign in', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final sessionController = SessionController();
    await sessionController.restore();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: SignInScreen(
          authRepository: _FakeAuthRepository(),
          sessionController: sessionController,
        ),
      ),
    );

    await tester.enterText(
        find.byType(TextField).at(0), 'citizen@mycity.local');
    await tester.enterText(find.byType(TextField).at(1), 'Password123!');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(sessionController.isAuthenticated, isTrue);
    expect(sessionController.session?.role, 'citizen');
  });
}

class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository() : super(ApiClient(baseUrl: 'http://localhost'));

  @override
  Future<AuthSession> signIn({
    required String identifier,
    required String password,
  }) async {
    return const AuthSession(
      userId: 'user-1',
      fullName: 'Citizen Demo',
      email: 'citizen@mycity.local',
      role: 'citizen',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    );
  }

  @override
  Future<AuthSession> register({
    required String fullName,
    required String identifier,
    required String password,
  }) {
    return signIn(identifier: identifier, password: password);
  }
}
