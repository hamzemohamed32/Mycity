import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/features/auth/domain/models/auth_session.dart';
import 'package:my_city_mobile/shared/storage/session/session_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  const session = AuthSession(
    userId: 'user-1',
    fullName: 'Citizen Demo',
    email: 'citizen@mycity.local',
    phone: '+252610000000',
    role: 'citizen',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  );

  test('saves and restores an authenticated session', () async {
    SharedPreferences.setMockInitialValues({});

    final controller = SessionController();
    await controller.save(session);

    final restored = SessionController();
    await restored.restore();

    expect(restored.isReady, isTrue);
    expect(restored.isAuthenticated, isTrue);
    expect(restored.session?.userId, session.userId);
    expect(restored.session?.email, session.email);
    expect(restored.session?.phone, session.phone);
  });

  test('updates tokens without changing the current user identity', () async {
    SharedPreferences.setMockInitialValues({});

    final controller = SessionController();
    await controller.save(session);
    await controller.updateTokens(
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    );

    expect(controller.session?.userId, session.userId);
    expect(controller.session?.fullName, session.fullName);
    expect(controller.session?.accessToken, 'new-access-token');
    expect(controller.session?.refreshToken, 'new-refresh-token');
  });

  test('clears persisted session data', () async {
    SharedPreferences.setMockInitialValues({});

    final controller = SessionController();
    await controller.save(session);
    await controller.clear();

    final restored = SessionController();
    await restored.restore();

    expect(restored.isReady, isTrue);
    expect(restored.isAuthenticated, isFalse);
    expect(restored.session, isNull);
  });
}
