import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import '../../../../shared/network/api_exception.dart';
import '../../../../shared/storage/offline/offline_queue.dart';
import '../../../../shared/storage/session/session_controller.dart';
import '../../../../shared/theme/app_theme.dart';
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
  final _imagePicker = ImagePicker();
  String _category = 'water';
  bool _isSubmitting = false;
  int _queuedCount = 0;
  XFile? _selectedImage;
  Uint8List? _selectedImageBytes;
  LatLng _selectedLocation = const LatLng(-1.286389, 36.817223);

  @override
  void initState() {
    super.initState();
    _refreshQueuedCount();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  String _newClientRequestId() {
    return 'mobile-${DateTime.now().microsecondsSinceEpoch}';
  }

  Future<void> _refreshQueuedCount() async {
    final queued = await widget.offlineQueue.load();
    if (!mounted) {
      return;
    }

    setState(() => _queuedCount = queued.length);
  }

  Future<bool> _queueCurrentDraft({required String successMessage}) async {
    final description = _descriptionController.text.trim();
    if (description.isEmpty) {
      _showMessage('Add a short description before saving.');
      return false;
    }

    await widget.offlineQueue.enqueue({
      'clientRequestId': _newClientRequestId(),
      'description': description,
      'category': _category,
      'lat': _selectedLocation.latitude,
      'lng': _selectedLocation.longitude,
      if (!kIsWeb && _selectedImage != null)
        'localImagePath': _selectedImage!.path,
      'createdAt': DateTime.now().toIso8601String(),
    });

    if (!mounted) {
      return true;
    }

    await _refreshQueuedCount();
    _showMessage(successMessage);
    return true;
  }

  Future<void> _saveOffline() async {
    final saved = await _queueCurrentDraft(
      successMessage: 'Complaint saved offline and queued for sync.',
    );

    if (!saved || !mounted) {
      return;
    }

    final reportAnother = await _showQueuedDialog();
    if (!mounted) {
      return;
    }

    if (reportAnother == true) {
      _resetDraft();
    } else {
      Navigator.of(context).pop(true);
    }
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
      String? imageUrl;
      if (_selectedImage != null && _selectedImageBytes != null) {
        imageUrl = await widget.complaintsRepository.uploadComplaintImageBytes(
          token: token,
          bytes: _selectedImageBytes!,
          fileName: _selectedImage!.name,
        );
      }

      await widget.complaintsRepository.createComplaint(
        token: token,
        description: description,
        category: _category,
        lat: _selectedLocation.latitude,
        lng: _selectedLocation.longitude,
        clientRequestId: _newClientRequestId(),
        imageUrl: imageUrl,
      );

      if (!mounted) {
        return;
      }

      final reportAnother = await _showSuccessDialog();
      if (!mounted) {
        return;
      }

      if (reportAnother == true) {
        _resetDraft();
      } else {
        Navigator.of(context).pop(true);
      }
    } on ApiException catch (error) {
      if (error.statusCode == 0) {
        final saved = await _queueCurrentDraft(
          successMessage: 'Server unavailable. Report saved offline for sync.',
        );
        if (saved && mounted) {
          final reportAnother = await _showQueuedDialog();
          if (!mounted) {
            return;
          }
          if (reportAnother == true) {
            _resetDraft();
          } else {
            Navigator.of(context).pop(true);
          }
        }
      } else {
        _showMessage(error.message);
      }
    } catch (_) {
      _showMessage('Unable to submit the complaint right now.');
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _pickImage() async {
    try {
      final file = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (file == null || !mounted) {
        return;
      }

      final bytes = await file.readAsBytes();
      if (!mounted) {
        return;
      }

      setState(() {
        _selectedImage = file;
        _selectedImageBytes = bytes;
      });
    } catch (_) {
      _showMessage('Unable to select an image right now.');
    }
  }

  void _clearImage() {
    setState(() {
      _selectedImage = null;
      _selectedImageBytes = null;
    });
  }

  void _resetDraft() {
    _descriptionController.clear();
    _clearImage();
  }

  Future<bool?> _showSuccessDialog() {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report submitted'),
        content:
            const Text('The city team can now review and update this issue.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Report another'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('View map'),
          ),
        ],
      ),
    );
  }

  Future<bool?> _showQueuedDialog() {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Saved offline'),
        content: const Text(
          'This report will sync automatically when the app can reach the backend.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Report another'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('View map'),
          ),
        ],
      ),
    );
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
          _SubmitHeader(queuedCount: _queuedCount),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(
                value: 'water',
                label: Text('Water'),
                icon: Icon(Icons.water_drop_outlined),
              ),
              ButtonSegment(
                value: 'roads',
                label: Text('Roads'),
                icon: Icon(Icons.route_outlined),
              ),
              ButtonSegment(
                value: 'lighting',
                label: Text('Lighting'),
                icon: Icon(Icons.lightbulb_outline),
              ),
              ButtonSegment(
                value: 'waste',
                label: Text('Waste'),
                icon: Icon(Icons.delete_outline),
              ),
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
              hintText:
                  'Example: Water main leak causing flooding near the school entrance.',
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Issue photo',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                if (_selectedImage == null)
                  OutlinedButton.icon(
                    onPressed: _isSubmitting ? null : _pickImage,
                    icon: const Icon(Icons.photo_library_outlined),
                    label: const Text('Choose image'),
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        clipBehavior: Clip.antiAlias,
                        child: Image.memory(
                          _selectedImageBytes!,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              _selectedImage!.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          TextButton(
                            onPressed: _isSubmitting ? null : _clearImage,
                            child: const Text('Remove'),
                          ),
                        ],
                      ),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Issue location',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 220,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: _selectedLocation,
                        initialZoom: 14,
                        onTap: (_, point) {
                          setState(() => _selectedLocation = point);
                        },
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.hamzemohamed.mycity',
                          maxNativeZoom: 19,
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: _selectedLocation,
                              width: 48,
                              height: 48,
                              child: const Icon(
                                Icons.location_pin,
                                color: Color(0xFF0E7C66),
                                size: 42,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Lat: ${_selectedLocation.latitude.toStringAsFixed(6)}, '
                  'Lng: ${_selectedLocation.longitude.toStringAsFixed(6)}',
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: _isSubmitting ? null : _saveOffline,
            icon: const Icon(Icons.cloud_off_outlined),
            label: const Text('Save offline'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
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

class _SubmitHeader extends StatelessWidget {
  const _SubmitHeader({required this.queuedCount});

  final int queuedCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.civicGreen.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.add_location_alt_outlined,
              color: AppColors.civicGreen,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'New city report',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  queuedCount == 0
                      ? 'Submit now or save offline if the backend is unavailable.'
                      : '$queuedCount offline report${queuedCount == 1 ? '' : 's'} waiting to sync.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
