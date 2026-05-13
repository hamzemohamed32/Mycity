class AuthSession {
  const AuthSession({
    required this.userId,
    required this.fullName,
    required this.role,
    required this.accessToken,
    required this.refreshToken,
    this.email,
    this.phone,
  });

  final String userId;
  final String fullName;
  final String? email;
  final String? phone;
  final String role;
  final String accessToken;
  final String refreshToken;

  factory AuthSession.fromResponse(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final tokens = json['tokens'] as Map<String, dynamic>? ?? <String, dynamic>{};

    return AuthSession(
      userId: (user['id'] ?? '') as String,
      fullName: (user['fullName'] ?? '') as String,
      email: user['email'] as String?,
      phone: user['phone'] as String?,
      role: (user['role'] ?? 'citizen') as String,
      accessToken: (tokens['accessToken'] ?? '') as String,
      refreshToken: (tokens['refreshToken'] ?? '') as String,
    );
  }
}
