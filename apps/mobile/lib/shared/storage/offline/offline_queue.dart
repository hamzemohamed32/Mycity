import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineComplaintQueue {
  static const _storageKey = 'offline_complaint_queue';

  Future<List<Map<String, dynamic>>> load() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getStringList(_storageKey) ?? <String>[];
    return raw.map((item) => jsonDecode(item) as Map<String, dynamic>).toList();
  }

  Future<void> enqueue(Map<String, dynamic> complaint) async {
    final preferences = await SharedPreferences.getInstance();
    final current = preferences.getStringList(_storageKey) ?? <String>[];
    current.add(jsonEncode(complaint));
    await preferences.setStringList(_storageKey, current);
  }

  Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_storageKey);
  }

  Future<void> removeByClientRequestId(String clientRequestId) async {
    if (clientRequestId.isEmpty) {
      return;
    }

    final preferences = await SharedPreferences.getInstance();
    final current = await load();
    final filtered = current
        .where((item) => item['clientRequestId'] != clientRequestId)
        .map(jsonEncode)
        .toList();

    await preferences.setStringList(_storageKey, filtered);
  }
}
