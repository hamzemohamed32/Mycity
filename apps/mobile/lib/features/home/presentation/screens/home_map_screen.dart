import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/offline/offline_queue.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../complaints/data/repositories/complaints_repository.dart';
import '../../../complaints/domain/models/complaint_record.dart';
import '../../../complaints/presentation/screens/complaint_detail_screen.dart';
import '../../../complaints/presentation/screens/submit_complaint_screen.dart';
import '../../../notifications/data/repositories/notifications_repository.dart';
import '../../../notifications/presentation/screens/notifications_screen.dart';

class HomeMapScreen extends StatefulWidget {
  const HomeMapScreen({
    super.key,
    required this.sessionController,
    required this.complaintsRepository,
    required this.notificationsRepository,
    required this.offlineQueue,
    required this.authRepository,
  });

  final SessionController sessionController;
  final ComplaintsRepository complaintsRepository;
  final NotificationsRepository notificationsRepository;
  final OfflineComplaintQueue offlineQueue;
  final AuthRepository authRepository;

  @override
  State<HomeMapScreen> createState() => _HomeMapScreenState();
}

class _HomeMapScreenState extends State<HomeMapScreen> {
  late Future<List<ComplaintRecord>> _complaintsFuture;
  int _selectedIndex = 0;
  String? _selectedComplaintId;

  @override
  void initState() {
    super.initState();
    _complaintsFuture = _refreshComplaints();
  }

  Future<List<ComplaintRecord>> _refreshComplaints(
      {bool canRefresh = true}) async {
    final token = widget.sessionController.accessToken!;
    late final int syncedCount;
    late final List<ComplaintRecord> complaints;

    try {
      syncedCount = await widget.complaintsRepository.syncQueuedComplaints(
        token: token,
        queue: widget.offlineQueue,
      );
      complaints = await widget.complaintsRepository.listComplaints(token);
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        final refreshed = canRefresh && await _refreshSession();
        if (refreshed) {
          return _refreshComplaints(canRefresh: false);
        }

        return const <ComplaintRecord>[];
      }

      rethrow;
    }

    if (complaints.isNotEmpty) {
      _selectedComplaintId ??= complaints.first.id;
    }

    if (syncedCount > 0 && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$syncedCount offline complaint synced.')),
      );
    }

    return complaints;
  }

  Future<bool> _refreshSession() async {
    final refreshToken = widget.sessionController.session?.refreshToken;
    if (refreshToken == null) {
      await widget.sessionController.clear();
      return false;
    }

    try {
      final tokens =
          await widget.authRepository.refresh(refreshToken: refreshToken);
      if (tokens.accessToken.isEmpty || tokens.refreshToken.isEmpty) {
        await widget.sessionController.clear();
        return false;
      }

      await widget.sessionController.updateTokens(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      );
      return true;
    } on ApiException {
      await widget.sessionController.clear();
      return false;
    }
  }

  void _reloadComplaints() {
    setState(() {
      _complaintsFuture = _refreshComplaints();
    });
  }

  Future<void> _openSubmitScreen() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SubmitComplaintScreen(
          complaintsRepository: widget.complaintsRepository,
          sessionController: widget.sessionController,
          offlineQueue: widget.offlineQueue,
        ),
      ),
    );

    if (created == true) {
      _reloadComplaints();
    }
  }

  Future<void> _openComplaint(String complaintId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ComplaintDetailScreen(
          complaintId: complaintId,
          complaintsRepository: widget.complaintsRepository,
          sessionController: widget.sessionController,
        ),
      ),
    );

    _reloadComplaints();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _buildMapWorkspace(context),
      NotificationsScreen(
        notificationsRepository: widget.notificationsRepository,
        sessionController: widget.sessionController,
      ),
    ];

    return Scaffold(
      body: pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map_outlined), label: 'Map'),
          NavigationDestination(
              icon: Icon(Icons.notifications_none), label: 'Updates'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openSubmitScreen,
        label: const Text('Report issue'),
        icon: const Icon(Icons.add_location_alt_outlined),
      ),
    );
  }

  Widget _buildMapWorkspace(BuildContext context) {
    return FutureBuilder<List<ComplaintRecord>>(
      future: _complaintsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.map_outlined,
                      size: 40, color: Color(0xFF0E7C66)),
                  const SizedBox(height: 12),
                  Text(
                    'Map data could not load',
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _friendlyLoadError(snapshot.error),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _reloadComplaints,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reload map'),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => widget.sessionController.clear(),
                    icon: const Icon(Icons.logout),
                    label: const Text('Sign out'),
                  ),
                ],
              ),
            ),
          );
        }

        final complaints = snapshot.data ?? const <ComplaintRecord>[];
        final selectedComplaint = _selectedComplaint(complaints);
        final initialTarget = complaints.isNotEmpty
            ? LatLng(complaints.first.lat, complaints.first.lng)
            : const LatLng(-1.286389, 36.817223);

        return SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('City Service Map',
                              style:
                                  Theme.of(context).textTheme.headlineMedium),
                          const SizedBox(height: 6),
                          Text(
                            'Signed in as ${widget.sessionController.session?.fullName ?? 'Citizen'}.',
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Refresh',
                      onPressed: _reloadComplaints,
                      icon: const Icon(Icons.refresh),
                    ),
                    IconButton(
                      tooltip: 'Sign out',
                      onPressed: () => widget.sessionController.clear(),
                      icon: const Icon(Icons.logout),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius:
                          const BorderRadius.vertical(top: Radius.circular(28)),
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: initialTarget,
                          initialZoom: 13,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate:
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.hamzemohamed.mycity',
                            maxNativeZoom: 19,
                          ),
                          MarkerLayer(
                            markers: complaints
                                .map(
                                  (complaint) => Marker(
                                    point: LatLng(complaint.lat, complaint.lng),
                                    width: 48,
                                    height: 48,
                                    child: IconButton.filled(
                                      tooltip: complaint.title,
                                      style: IconButton.styleFrom(
                                        backgroundColor:
                                            const Color(0xFF0E7C66),
                                        foregroundColor: Colors.white,
                                      ),
                                      icon: const Icon(Icons.place),
                                      onPressed: () {
                                        setState(() => _selectedComplaintId =
                                            complaint.id);
                                      },
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                          const RichAttributionWidget(
                            attributions: [
                              TextSourceAttribution(
                                'OpenStreetMap contributors',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (selectedComplaint != null)
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 18,
                        child: Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(22),
                            onTap: () => _openComplaint(selectedComplaint.id),
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Row(
                                children: [
                                  const CircleAvatar(
                                    backgroundColor: Color(0xFFE3F1EC),
                                    child: Icon(Icons.place_outlined,
                                        color: Color(0xFF0E7C66)),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          selectedComplaint.title,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${selectedComplaint.statusLabel} / ${selectedComplaint.supportCount} supporters / ${selectedComplaint.districtName ?? 'Unassigned'}',
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right),
                                ],
                              ),
                            ),
                          ),
                        ),
                      )
                    else
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 18,
                        child: Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: const Text(
                              'No complaints yet. Submit the first report from this account.'),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  ComplaintRecord? _selectedComplaint(List<ComplaintRecord> complaints) {
    if (complaints.isEmpty) {
      return null;
    }

    for (final complaint in complaints) {
      if (complaint.id == _selectedComplaintId) {
        return complaint;
      }
    }

    return complaints.first;
  }

  String _friendlyLoadError(Object? error) {
    final message = error?.toString() ?? '';

    if (message.contains(':')) {
      return message.split(':').last.trim();
    }

    if (message.trim().isNotEmpty) {
      return message.trim();
    }

    return 'Check that the backend, PostgreSQL, and Redis are running, then try again.';
  }
}
