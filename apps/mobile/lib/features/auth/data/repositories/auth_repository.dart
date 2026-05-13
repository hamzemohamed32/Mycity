import '../../../../shared/network/api_client.dart';
import '../../domain/models/auth_session.dart';

class AuthRepository {
  AuthRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<AuthSession> signIn({
    required String identifier,
    required String password,
  }) async {
    final payload = <String, dynamic>{
      'password': password,
      if (_looksLikeEmail(identifier)) 'email': identifier else 'phone': identifier,
    };

    final response = await _apiClient.post('/auth/login', body: payload);
    return AuthSession.fromResponse(response as Map<String, dynamic>);
  }

  Future<AuthSession> register({
    required String fullName,
    required String identifier,
    required String password,
  }) async {
    final payload = <String, dynamic>{
      'fullName': fullName,
      'password': password,
      if (_looksLikeEmail(identifier)) 'email': identifier else 'phone': identifier,
    };

    final response = await _apiClient.post('/auth/register', body: payload);
    return AuthSession.fromResponse(response as Map<String, dynamic>);
  }

  bool _looksLikeEmail(String value) => value.contains('@');
}
