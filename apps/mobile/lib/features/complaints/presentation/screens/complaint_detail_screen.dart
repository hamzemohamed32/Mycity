import 'package:flutter/material.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../data/repositories/complaints_repository.dart';
import '../../domain/models/complaint_record.dart';

class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({
    super.key,
    required this.complaintId,
    required this.complaintsRepository,
    required this.sessionController,
  });

  final String complaintId;
  final ComplaintsRepository complaintsRepository;
  final SessionController sessionController;

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  final _commentController = TextEditingController();
  late Future<ComplaintRecord> _complaintFuture;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _complaintFuture = _loadComplaint();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<ComplaintRecord> _loadComplaint() {
    final token = widget.sessionController.accessToken;
    if (token == null) {
      throw ApiException(
        statusCode: 401,
        message: 'Your session has expired. Sign in again.',
      );
    }

    return widget.complaintsRepository.getComplaint(
      token: token,
      complaintId: widget.complaintId,
    );
  }

  void _reload() {
    setState(() {
      _complaintFuture = _loadComplaint();
    });
  }

  Future<void> _supportComplaint() async {
    final token = widget.sessionController.accessToken;
    if (token == null) {
      _showMessage('Your session has expired. Sign in again.');
      return;
    }

    setState(() => _isSaving = true);

    try {
      await widget.complaintsRepository.addSupport(
        token: token,
        complaintId: widget.complaintId,
      );
      _reload();
    } on ApiException catch (error) {
      _showMessage(error.message);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _addComment() async {
    final body = _commentController.text.trim();
    final token = widget.sessionController.accessToken;

    if (body.isEmpty) {
      return;
    }

    if (token == null) {
      _showMessage('Your session has expired. Sign in again.');
      return;
    }

    setState(() => _isSaving = true);

    try {
      await widget.complaintsRepository.addComment(
        token: token,
        complaintId: widget.complaintId,
        body: body,
      );
      _commentController.clear();
      _reload();
    } on ApiException catch (error) {
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
        title: const Text('Complaint detail'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: FutureBuilder<ComplaintRecord>(
        future: _complaintFuture,
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
                    const Icon(Icons.report_problem_outlined,
                        size: 42, color: AppColors.civicGreen),
                    const SizedBox(height: 12),
                    Text(
                      'Unable to load this complaint',
                      style: Theme.of(context).textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _friendlyError(snapshot.error),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            );
          }

          final complaint = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _StatusHeader(complaint: complaint),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  height: 220,
                  decoration: BoxDecoration(
                    color: AppColors.border.withValues(alpha: 0.55),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: complaint.imageUrl != null &&
                          complaint.imageUrl!.isNotEmpty
                      ? Image.network(
                          complaint.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const _ImageFallback(),
                        )
                      : const _ImageFallback(),
                ),
              ),
              const SizedBox(height: 16),
              _InfoPanel(
                title: 'Report details',
                children: [
                  Text(
                    complaint.description,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _MetaChip(
                          icon: Icons.category_outlined,
                          label: complaint.category),
                      _MetaChip(
                          icon: Icons.location_city_outlined,
                          label:
                              complaint.districtName ?? 'Unassigned district'),
                      _MetaChip(
                          icon: Icons.group_outlined,
                          label: '${complaint.supportCount} supporters'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _LocationSummary(complaint: complaint),
                ],
              ),
              if (complaint.adminNote != null &&
                  complaint.adminNote!.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                _InfoPanel(
                  title: 'Latest city note',
                  children: [
                    Text(complaint.adminNote!),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _isSaving ? null : _supportComplaint,
                icon: _isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.thumb_up_alt_outlined),
                label: const Text('Support this issue'),
              ),
              const SizedBox(height: 16),
              _InfoPanel(
                title: 'Comments',
                children: [
                  TextField(
                    controller: _commentController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Add a comment',
                      hintText: 'Share more detail for district teams.',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.icon(
                      onPressed: _isSaving ? null : _addComment,
                      icon: const Icon(Icons.send_outlined),
                      label: const Text('Post comment'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (complaint.comments.isEmpty)
                    Text(
                      'No comments yet.',
                      style: Theme.of(context).textTheme.bodySmall,
                    )
                  else
                    ...complaint.comments.map(
                      (comment) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _CommentRow(
                          author: comment.authorName,
                          body: comment.body,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  String _friendlyError(Object? error) {
    if (error is ApiException) {
      return error.message;
    }

    final message = error?.toString().trim() ?? '';
    if (message.isNotEmpty) {
      return message;
    }

    return 'Check your connection and try again.';
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.complaint});

  final ComplaintRecord complaint;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(complaint.status);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(_statusIcon(complaint.status), color: statusColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      complaint.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Reported by ${complaint.createdByName ?? 'Citizen'}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _StatusSteps(status: complaint.status),
        ],
      ),
    );
  }
}

class _StatusSteps extends StatelessWidget {
  const _StatusSteps({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    const steps = [
      ('pending', 'Received'),
      ('in_progress', 'In progress'),
      ('resolved', 'Resolved'),
    ];
    final activeIndex = steps.indexWhere((step) => step.$1 == status);
    final resolvedIndex = activeIndex < 0 ? 0 : activeIndex;

    return Row(
      children: [
        for (var index = 0; index < steps.length; index++) ...[
          Expanded(
            child: Column(
              children: [
                Icon(
                  index <= resolvedIndex
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: index <= resolvedIndex
                      ? AppColors.civicGreen
                      : AppColors.muted,
                  size: 20,
                ),
                const SizedBox(height: 6),
                Text(
                  steps[index].$2,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          if (index < steps.length - 1)
            Container(
              width: 24,
              height: 1,
              color: index < resolvedIndex
                  ? AppColors.civicGreen
                  : AppColors.border,
            ),
        ],
      ],
    );
  }
}

class _InfoPanel extends StatelessWidget {
  const _InfoPanel({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
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
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _LocationSummary extends StatelessWidget {
  const _LocationSummary({required this.complaint});

  final ComplaintRecord complaint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.canvas,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.pin_drop_outlined, color: AppColors.civicGreen),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Location ${complaint.lat.toStringAsFixed(5)}, ${complaint.lng.toStringAsFixed(5)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Icon(Icons.image_outlined, size: 46, color: AppColors.muted),
    );
  }
}

Color _statusColor(String status) {
  switch (status) {
    case 'resolved':
      return AppColors.resolved;
    case 'in_progress':
      return AppColors.safetyBlue;
    default:
      return AppColors.attention;
  }
}

IconData _statusIcon(String status) {
  switch (status) {
    case 'resolved':
      return Icons.check_circle_outline;
    case 'in_progress':
      return Icons.construction_outlined;
    default:
      return Icons.schedule;
  }
}

class _CommentRow extends StatelessWidget {
  const _CommentRow({
    required this.author,
    required this.body,
  });

  final String author;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.canvas,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(author, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(body),
        ],
      ),
    );
  }
}
