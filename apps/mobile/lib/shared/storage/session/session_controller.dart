import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../features/auth/domain/models/auth_session.dart';

class SessionController extends ChangeNotifier {
  static const _accessTokenKey = 'session_access_token';
  static const _refreshTokenKey = 'session_refresh_token';
  static const _userIdKey = 'session_user_id';
  static const _fullNameKey = 'session_full_name';
  static const _emailKey = 'session_email';
  static const _phoneKey = 'session_phone';
  static const _roleKey = 'session_role';

  AuthSession? _session;
  bool _isReady = false;

  bool get isReady => _isReady;
  bool get isAuthenticated => _session != null;
  AuthSession? get session => _session;
  String? get accessToken => _session?.accessToken;

  Future<void> restore() async {
    final preferences = await SharedPreferences.getInstance();
    final accessToken = preferences.getString(_accessTokenKey);
    final refreshToken = preferences.getString(_refreshTokenKey);
    final userId = preferences.getString(_userIdKey);
    final fullName = preferences.getString(_fullNameKey);
    final role = preferences.getString(_roleKey);

    if (accessToken != null &&
        refreshToken != null &&
        userId != null &&
        fullName != null &&
        role != null) {
      _session = AuthSession(
        userId: userId,
        fullName: fullName,
        email: preferences.getString(_emailKey),
        phone: preferences.getString(_phoneKey),
        role: role,
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
    }

    _isReady = true;
    notifyListeners();
  }

  Future<void> save(AuthSession session) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_accessTokenKey, session.accessToken);
    await preferences.setString(_refreshTokenKey, session.refreshToken);
    await preferences.setString(_userIdKey, session.userId);
    await preferences.setString(_fullNameKey, session.fullName);
    await preferences.setString(_roleKey, session.role);

    if (session.email != null) {
      await preferences.setString(_emailKey, session.email!);
    } else {
      await preferences.remove(_emailKey);
    }

    if (session.phone != null) {
      await preferences.setString(_phoneKey, session.phone!);
    } else {
      await preferences.remove(_phoneKey);
    }

    _session = session;
    _isReady = true;
    notifyListeners();
  }

  Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_accessTokenKey);
    await preferences.remove(_refreshTokenKey);
    await preferences.remove(_userIdKey);
    await preferences.remove(_fullNameKey);
    await preferences.remove(_emailKey);
    await preferences.remove(_phoneKey);
    await preferences.remove(_roleKey);
    _session = null;
    _isReady = true;
    notifyListeners();
  }
}
