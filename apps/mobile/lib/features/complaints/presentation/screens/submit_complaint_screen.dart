import 'package:flutter/material.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/offline/offline_queue.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../data/repositories/complaints_repository.dart';

class SubmitComplaintScreen extends StatefulWidget {
  const SubmitComplaintScreen({
    super.key,
    required this.complaintsRepository,
    required this.sessionController,
    required this.offlineQueue,
  });

  final ComplaintsRepository complaintsRepository;
  final SessionController sessionController;
  final OfflineComplaintQueue offlineQueue;

  @override
  State<SubmitComplaintScreen> createState() => _SubmitComplaintScreenState();
}

class _SubmitComplaintScreenState extends State<SubmitComplaintScreen> {
  final _descriptionController = TextEditingController();
  String _category = 'water';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  String _newClientRequestId() {
    return 'mobile-${DateTime.now().microsecondsSinceEpoch}';
  }

  Future<void> _saveOffline() async {
    final description = _descriptionController.text.trim();
    if (description.isEmpty) {
      _showMessage('Add a short description before saving.');
      return;
    }

    await widget.offlineQueue.enqueue({
      'clientRequestId': _newClientRequestId(),
      'description': description,
      'category': _category,
      'lat': -1.286389,
      'lng': 36.817223,
      'createdAt': DateTime.now().toIso8601String(),
    });

    if (!mounted) {
      return;
    }

    _showMessage('Complaint saved offline and queued for sync.');
  }

  Future<void> _submitNow() async {
    final description = _descriptionController.text.trim();
    final token = widget.sessionController.accessToken;

    if (description.isEmpty) {
      _showMessage('Add a short description before submitting.');
      return;
    }

    if (token == null) {
      _showMessage('Your session has expired. Sign in again.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await widget.complaintsRepository.createComplaint(
        token: token,
        description: description,
        category: _category,
        lat: -1.286389,
        lng: 36.817223,
        clientRequestId: _newClientRequestId(),
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      _showMessage(error.message);
    } catch (_) {
      _showMessage('Unable to submit the complaint right now.');
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
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
      appBar: AppBar(title: const Text('Report issue')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'water', label: Text('Water')),
              ButtonSegment(value: 'roads', label: Text('Roads')),
              ButtonSegment(value: 'lighting', label: Text('Lighting')),
              ButtonSegment(value: 'waste', label: Text('Waste')),
            ],
            selected: {_category},
            onSelectionChanged: (selection) {
              setState(() => _category = selection.first);
            },
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _descriptionController,
            maxLines: 6,
            decoration: const InputDecoration(
              labelText: 'Describe the issue',
              hintText: 'Example: Water main leak causing flooding near the school entrance.',
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Captured location', style: TextStyle(fontWeight: FontWeight.w700)),
                SizedBox(height: 6),
                Text('Lat: -1.286389, Lng: 36.817223'),
                SizedBox(height: 12),
                Text('Direct image upload can be added next on top of the signed upload session endpoint.'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: _isSubmitting ? null : _saveOffline,
            icon: const Icon(Icons.cloud_off_outlined),
            label: const Text('Save offline'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _isSubmitting ? null : _submitNow,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send_outlined),
            label: const Text('Submit now'),
          ),
        ],
      ),
    );
  }
}
