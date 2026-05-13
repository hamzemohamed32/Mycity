import 'package:flutter/material.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/session/session_controller.dart';
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
    return widget.complaintsRepository.getComplaint(
      token: widget.sessionController.accessToken!,
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
      appBar: AppBar(title: const Text('Complaint detail')),
      body: FutureBuilder<ComplaintRecord>(
        future: _complaintFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Unable to load this complaint.'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _reload,
                    child: const Text('Try again'),
                  ),
                ],
              ),
            );
          }

          final complaint = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                height: 220,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  gradient: const LinearGradient(
                    colors: [Color(0xFFCADFD8), Color(0xFFE8EFEA)],
                  ),
                ),
                child: complaint.imageUrl != null && complaint.imageUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Image.network(
                          complaint.imageUrl!,
                          fit: BoxFit.cover,
                        ),
                      )
                    : const Center(
                        child: Icon(Icons.image_outlined, size: 46),
                      ),
              ),
              const SizedBox(height: 18),
              Text(
                complaint.title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                '${complaint.statusLabel} / ${complaint.districtName ?? 'Unassigned district'} / ${complaint.supportCount} supporters',
              ),
              const SizedBox(height: 18),
              Text(complaint.description),
              const SizedBox(height: 20),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  Chip(label: Text(complaint.category)),
                  Chip(label: Text(complaint.statusLabel)),
                  if (complaint.districtName != null)
                    Chip(label: Text(complaint.districtName!)),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _isSaving ? null : _supportComplaint,
                icon: const Icon(Icons.thumb_up_alt_outlined),
                label: const Text('Support this issue'),
              ),
              const SizedBox(height: 16),
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
                child: FilledButton(
                  onPressed: _isSaving ? null : _addComment,
                  child: const Text('Post comment'),
                ),
              ),
              const SizedBox(height: 20),
              if (complaint.comments.isEmpty)
                const Text('No comments yet.')
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
          );
        },
      ),
    );
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
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
