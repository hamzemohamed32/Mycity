import 'package:flutter/material.dart';
import '../../features/auth/data/repositories/auth_repository.dart';
import '../../features/auth/presentation/screens/sign_in_screen.dart';
import '../../features/complaints/data/repositories/complaints_repository.dart';
import '../../features/home/presentation/screens/home_map_screen.dart';
import '../../features/notifications/data/repositories/notifications_repository.dart';
import '../../shared/network/api_client.dart';
import '../../shared/storage/offline/offline_queue.dart';
import '../../shared/storage/session/session_controller.dart';
import '../../shared/theme/app_theme.dart';

class MyCityApp extends StatefulWidget {
  const MyCityApp({super.key});

  @override
  State<MyCityApp> createState() => _MyCityAppState();
}

class _MyCityAppState extends State<MyCityApp> {
  late final SessionController _sessionController;
  late final OfflineComplaintQueue _offlineComplaintQueue;
  late final ApiClient _apiClient;
  late final AuthRepository _authRepository;
  late final ComplaintsRepository _complaintsRepository;
  late final NotificationsRepository _notificationsRepository;

  @override
  void initState() {
    super.initState();
    _sessionController = SessionController();
    _offlineComplaintQueue = OfflineComplaintQueue();
    _apiClient = ApiClient();
    _authRepository = AuthRepository(_apiClient);
    _complaintsRepository = ComplaintsRepository(_apiClient);
    _notificationsRepository = NotificationsRepository(_apiClient);
    _sessionController.restore();
  }

  @override
  void dispose() {
    _sessionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'MyCity',
      theme: buildAppTheme(),
      home: AnimatedBuilder(
        animation: _sessionController,
        builder: (context, _) {
          if (!_sessionController.isReady) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }

          if (_sessionController.isAuthenticated) {
            return HomeMapScreen(
              sessionController: _sessionController,
              complaintsRepository: _complaintsRepository,
              notificationsRepository: _notificationsRepository,
              offlineQueue: _offlineComplaintQueue,
            );
          }

          return SignInScreen(
            authRepository: _authRepository,
            sessionController: _sessionController,
          );
        },
      ),
    );
  }
}
