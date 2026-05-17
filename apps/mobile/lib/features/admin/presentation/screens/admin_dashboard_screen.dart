import 'package:flutter/material.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../auth/data/repositories/auth_repository.dart';
import '../../../complaints/data/repositories/complaints_repository.dart';
import '../../../complaints/domain/models/complaint_record.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({
    super.key,
    required this.sessionController,
    required this.complaintsRepository,
    required this.authRepository,
  });

  final SessionController sessionController;
  final ComplaintsRepository complaintsRepository;
  final AuthRepository authRepository;

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  late Future<List<ComplaintRecord>> _complaintsFuture;
  String _statusFilter = 'all';
  String _categoryFilter = 'all';
  String _districtFilter = 'all';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _complaintsFuture = _loadComplaints();
  }

  Future<List<ComplaintRecord>> _loadComplaints(
      {bool canRefresh = true}) async {
    final token = widget.sessionController.accessToken;
    if (token == null) {
      return const <ComplaintRecord>[];
    }

    try {
      return widget.complaintsRepository.listComplaints(token);
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        final refreshed = canRefresh && await _refreshSession();
        if (refreshed) {
          return _loadComplaints(canRefresh: false);
        }

        return const <ComplaintRecord>[];
      }

      rethrow;
    }
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

  void _reload() {
    setState(() {
      _complaintsFuture = _loadComplaints();
    });
  }

  Future<void> _updateStatus(
    ComplaintRecord complaint,
    String status, {
    String? assignedAdminId,
    String? note,
    bool canRefresh = true,
  }) async {
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
        assignedAdminId: assignedAdminId,
        note: note,
      );
      _showMessage('Status updated.');
      _reload();
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        final refreshed = canRefresh && await _refreshSession();
        if (refreshed) {
          await _updateStatus(
            complaint,
            status,
            assignedAdminId: assignedAdminId,
            note: note,
            canRefresh: false,
          );
        }
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

  Future<void> _openComplaintManager(ComplaintRecord complaint) async {
    final result = await showModalBottomSheet<_AdminComplaintAction>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => _AdminComplaintSheet(
        complaint: complaint,
        currentAdminId: widget.sessionController.session?.userId,
      ),
    );

    if (result == null) {
      return;
    }

    await _updateStatus(
      complaint,
      result.status,
      assignedAdminId: result.assignToMe
          ? widget.sessionController.session?.userId
          : complaint.assignedAdminId,
      note: result.note,
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
          final categories =
              _filterValues(complaints.map((item) => item.category));
          final districts = _filterValues(
            complaints.map((item) => item.districtName ?? 'Unassigned'),
          );

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
                if (_isMayorView) ...[
                  const SizedBox(height: 16),
                  _MayorOperationsPanel(
                    complaints: complaints,
                    onOpenComplaint: _openComplaintManager,
                  ),
                ],
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
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _FilterMenu(
                      label: 'Category',
                      value: _categoryFilter,
                      values: categories,
                      onChanged: (value) =>
                          setState(() => _categoryFilter = value),
                    ),
                    _FilterMenu(
                      label: 'District',
                      value: _districtFilter,
                      values: districts,
                      onChanged: (value) =>
                          setState(() => _districtFilter = value),
                    ),
                  ],
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
                        onOpen: () => _openComplaintManager(complaint),
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
    return complaints.where((complaint) {
      final statusMatches =
          _statusFilter == 'all' || complaint.status == _statusFilter;
      final categoryMatches =
          _categoryFilter == 'all' || complaint.category == _categoryFilter;
      final district = complaint.districtName ?? 'Unassigned';
      final districtMatches =
          _districtFilter == 'all' || district == _districtFilter;

      return statusMatches && categoryMatches && districtMatches;
    }).toList();
  }

  List<String> _filterValues(Iterable<String> values) {
    final unique =
        values.where((value) => value.trim().isNotEmpty).toSet().toList();
    unique.sort();
    return ['all', ...unique];
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

  bool get _isMayorView =>
      widget.sessionController.session?.role == 'city_admin' ||
      widget.sessionController.session?.role == 'system_admin';
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
        color: AppColors.civicGreen.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: AppColors.civicGreen,
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

class _MayorOperationsPanel extends StatelessWidget {
  const _MayorOperationsPanel({
    required this.complaints,
    required this.onOpenComplaint,
  });

  final List<ComplaintRecord> complaints;
  final ValueChanged<ComplaintRecord> onOpenComplaint;

  @override
  Widget build(BuildContext context) {
    final unresolved = complaints
        .where((item) => item.status != 'resolved')
        .toList()
      ..sort((a, b) => b.supportCount.compareTo(a.supportCount));
    final unassigned = unresolved
        .where(
            (item) => item.status == 'pending' || item.assignedAdminId == null)
        .length;
    final top = unresolved.take(3).toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.insights_outlined, color: AppColors.safetyBlue),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Mayor operations view',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _StatChip(
                icon: Icons.warning_amber_outlined,
                label: 'Needs action',
                value: unresolved.length,
              ),
              _StatChip(
                icon: Icons.person_search_outlined,
                label: 'Unassigned',
                value: unassigned,
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (top.isEmpty)
            Text(
              'No unresolved complaints need mayor attention.',
              style: Theme.of(context).textTheme.bodySmall,
            )
          else
            ...top.map(
              (complaint) => _OperationalFocusTile(
                complaint: complaint,
                onOpen: () => onOpenComplaint(complaint),
              ),
            ),
        ],
      ),
    );
  }
}

class _OperationalFocusTile extends StatelessWidget {
  const _OperationalFocusTile({
    required this.complaint,
    required this.onOpen,
  });

  final ComplaintRecord complaint;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Material(
        color: AppColors.canvas,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.attention.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.priority_high,
                      color: AppColors.attention),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        complaint.title,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${complaint.statusLabel} / ${complaint.supportCount} supporters / ${complaint.districtName ?? 'Unassigned'}',
                        style: Theme.of(context).textTheme.bodySmall,
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

class _FilterMenu extends StatelessWidget {
  const _FilterMenu({
    required this.label,
    required this.value,
    required this.values,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> values;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownMenu<String>(
      label: Text(label),
      initialSelection: value,
      dropdownMenuEntries: values
          .map(
            (item) => DropdownMenuEntry(
              value: item,
              label: item == 'all' ? 'All' : item,
            ),
          )
          .toList(),
      onSelected: (selected) {
        if (selected != null) {
          onChanged(selected);
        }
      },
    );
  }
}

class _ComplaintManagementTile extends StatelessWidget {
  const _ComplaintManagementTile({
    required this.complaint,
    required this.isSaving,
    required this.onOpen,
    required this.onStatusSelected,
  });

  final ComplaintRecord complaint;
  final bool isSaving;
  final VoidCallback onOpen;
  final ValueChanged<String> onStatusSelected;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onOpen,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CircleAvatar(
                    backgroundColor: Color(0xFFE3F1EC),
                    child:
                        Icon(Icons.place_outlined, color: AppColors.civicGreen),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(complaint.title,
                            style:
                                const TextStyle(fontWeight: FontWeight.w800)),
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
                  TextButton.icon(
                    onPressed: onOpen,
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Manage'),
                  ),
                ],
              ),
            ],
          ),
        ),
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

class _AdminComplaintAction {
  const _AdminComplaintAction({
    required this.status,
    required this.assignToMe,
    required this.note,
  });

  final String status;
  final bool assignToMe;
  final String note;
}

class _AdminComplaintSheet extends StatefulWidget {
  const _AdminComplaintSheet({
    required this.complaint,
    required this.currentAdminId,
  });

  final ComplaintRecord complaint;
  final String? currentAdminId;

  @override
  State<_AdminComplaintSheet> createState() => _AdminComplaintSheetState();
}

class _AdminComplaintSheetState extends State<_AdminComplaintSheet> {
  late String _status;
  late bool _assignToMe;
  late final TextEditingController _noteController;

  @override
  void initState() {
    super.initState();
    _status = widget.complaint.status;
    _assignToMe = widget.currentAdminId != null &&
        widget.complaint.assignedAdminId == widget.currentAdminId;
    _noteController =
        TextEditingController(text: widget.complaint.adminNote ?? '');
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: ListView(
        shrinkWrap: true,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Manage complaint',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              IconButton(
                tooltip: 'Close',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(widget.complaint.description),
          if (widget.complaint.adminNote != null &&
              widget.complaint.adminNote!.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.canvas,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.sticky_note_2_outlined,
                      color: AppColors.safetyBlue),
                  const SizedBox(width: 10),
                  Expanded(child: Text(widget.complaint.adminNote!)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text(widget.complaint.category)),
              Chip(label: Text(widget.complaint.districtName ?? 'Unassigned')),
              Chip(label: Text('${widget.complaint.supportCount} supporters')),
            ],
          ),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(
                value: 'pending',
                label: Text('Pending'),
                icon: Icon(Icons.schedule),
              ),
              ButtonSegment(
                value: 'in_progress',
                label: Text('Active'),
                icon: Icon(Icons.construction),
              ),
              ButtonSegment(
                value: 'resolved',
                label: Text('Resolved'),
                icon: Icon(Icons.check_circle_outline),
              ),
            ],
            selected: {_status},
            onSelectionChanged: (selection) {
              setState(() => _status = selection.first);
            },
          ),
          const SizedBox(height: 12),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Assign to me'),
            value: _assignToMe,
            onChanged: widget.currentAdminId == null
                ? null
                : (value) => setState(() => _assignToMe = value ?? false),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Admin note',
              hintText: 'Add the latest action, blocker, or decision.',
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).pop(
                _AdminComplaintAction(
                  status: _status,
                  assignToMe: _assignToMe,
                  note: _noteController.text,
                ),
              );
            },
            icon: const Icon(Icons.save_outlined),
            label: const Text('Save changes'),
          ),
        ],
      ),
    );
  }
}
