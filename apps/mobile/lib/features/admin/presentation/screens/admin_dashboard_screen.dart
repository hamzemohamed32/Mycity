import 'package:flutter/material.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../../complaints/data/repositories/complaints_repository.dart';
import '../../../complaints/domain/models/complaint_record.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({
    super.key,
    required this.sessionController,
    required this.complaintsRepository,
  });

  final SessionController sessionController;
  final ComplaintsRepository complaintsRepository;

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  late Future<List<ComplaintRecord>> _complaintsFuture;
  String _statusFilter = 'all';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _complaintsFuture = _loadComplaints();
  }

  Future<List<ComplaintRecord>> _loadComplaints() async {
    final token = widget.sessionController.accessToken;
    if (token == null) {
      return const <ComplaintRecord>[];
    }

    try {
      return widget.complaintsRepository.listComplaints(token);
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        await widget.sessionController.clear();
        return const <ComplaintRecord>[];
      }

      rethrow;
    }
  }

  void _reload() {
    setState(() {
      _complaintsFuture = _loadComplaints();
    });
  }

  Future<void> _updateStatus(ComplaintRecord complaint, String status) async {
    final token = widget.sessionController.accessToken;
    if (token == null) {
      await widget.sessionController.clear();
      return;
    }

    setState(() => _isSaving = true);

    try {
      await widget.complaintsRepository.updateStatus(
        token: token,
        complaintId: complaint.id,
        status: status,
      );
      _showMessage('Status updated.');
      _reload();
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        await widget.sessionController.clear();
        return;
      }

      _showMessage(error.message);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_roleTitle),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => widget.sessionController.clear(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: FutureBuilder<List<ComplaintRecord>>(
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
                    const Icon(Icons.error_outline,
                        size: 40, color: Color(0xFF0E7C66)),
                    const SizedBox(height: 12),
                    const Text('Dashboard data could not load.'),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Reload'),
                    ),
                  ],
                ),
              ),
            );
          }

          final complaints = snapshot.data ?? const <ComplaintRecord>[];
          final filtered = _filteredComplaints(complaints);

          return RefreshIndicator(
            onRefresh: () async {
              _reload();
              await _complaintsFuture;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _Header(
                  name: widget.sessionController.session?.fullName ?? 'Admin',
                  role: _roleTitle,
                ),
                const SizedBox(height: 16),
                _SummaryRow(complaints: complaints),
                const SizedBox(height: 16),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                        value: 'all',
                        label: Text('All'),
                        icon: Icon(Icons.list_alt)),
                    ButtonSegment(
                        value: 'pending',
                        label: Text('Pending'),
                        icon: Icon(Icons.schedule)),
                    ButtonSegment(
                        value: 'in_progress',
                        label: Text('Active'),
                        icon: Icon(Icons.construction)),
                    ButtonSegment(
                        value: 'resolved',
                        label: Text('Resolved'),
                        icon: Icon(Icons.check_circle_outline)),
                  ],
                  selected: {_statusFilter},
                  onSelectionChanged: (selection) {
                    setState(() => _statusFilter = selection.first);
                  },
                ),
                const SizedBox(height: 16),
                if (filtered.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 48),
                    child:
                        Center(child: Text('No complaints match this view.')),
                  )
                else
                  ...filtered.map(
                    (complaint) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _ComplaintManagementTile(
                        complaint: complaint,
                        isSaving: _isSaving,
                        onStatusSelected: (status) =>
                            _updateStatus(complaint, status),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  List<ComplaintRecord> _filteredComplaints(List<ComplaintRecord> complaints) {
    if (_statusFilter == 'all') {
      return complaints;
    }

    return complaints
        .where((complaint) => complaint.status == _statusFilter)
        .toList();
  }

  String get _roleTitle {
    switch (widget.sessionController.session?.role) {
      case 'city_admin':
        return 'Mayor Dashboard';
      case 'system_admin':
        return 'System Admin Dashboard';
      case 'district_admin':
        return 'District Admin Dashboard';
      default:
        return 'Admin Dashboard';
    }
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.name,
    required this.role,
  });

  final String name;
  final String role;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFE3F1EC),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: Color(0xFF0E7C66),
            foregroundColor: Colors.white,
            child: Icon(Icons.admin_panel_settings_outlined),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 4),
                Text(role),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.complaints});

  final List<ComplaintRecord> complaints;

  @override
  Widget build(BuildContext context) {
    final pending = complaints.where((item) => item.status == 'pending').length;
    final active =
        complaints.where((item) => item.status == 'in_progress').length;
    final resolved =
        complaints.where((item) => item.status == 'resolved').length;

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _StatChip(
            icon: Icons.list_alt, label: 'Total', value: complaints.length),
        _StatChip(icon: Icons.schedule, label: 'Pending', value: pending),
        _StatChip(icon: Icons.construction, label: 'Active', value: active),
        _StatChip(
            icon: Icons.check_circle_outline,
            label: 'Resolved',
            value: resolved),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 18),
      label: Text('$label: $value'),
    );
  }
}

class _ComplaintManagementTile extends StatelessWidget {
  const _ComplaintManagementTile({
    required this.complaint,
    required this.isSaving,
    required this.onStatusSelected,
  });

  final ComplaintRecord complaint;
  final bool isSaving;
  final ValueChanged<String> onStatusSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE0E6E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CircleAvatar(
                backgroundColor: Color(0xFFE3F1EC),
                child: Icon(Icons.place_outlined, color: Color(0xFF0E7C66)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(complaint.title,
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text(
                      '${complaint.districtName ?? 'Unassigned'} / ${complaint.supportCount} supporters',
                    ),
                    if (complaint.createdByName != null) ...[
                      const SizedBox(height: 4),
                      Text('Reported by ${complaint.createdByName}'),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(complaint.description),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Chip(label: Text(complaint.category)),
              Chip(label: Text(complaint.statusLabel)),
              _StatusButton(
                label: 'Mark pending',
                status: 'pending',
                currentStatus: complaint.status,
                isSaving: isSaving,
                onSelected: onStatusSelected,
              ),
              _StatusButton(
                label: 'Start work',
                status: 'in_progress',
                currentStatus: complaint.status,
                isSaving: isSaving,
                onSelected: onStatusSelected,
              ),
              _StatusButton(
                label: 'Resolve',
                status: 'resolved',
                currentStatus: complaint.status,
                isSaving: isSaving,
                onSelected: onStatusSelected,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusButton extends StatelessWidget {
  const _StatusButton({
    required this.label,
    required this.status,
    required this.currentStatus,
    required this.isSaving,
    required this.onSelected,
  });

  final String label;
  final String status;
  final String currentStatus;
  final bool isSaving;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed:
          isSaving || status == currentStatus ? null : () => onSelected(status),
      child: Text(label),
    );
  }
}
