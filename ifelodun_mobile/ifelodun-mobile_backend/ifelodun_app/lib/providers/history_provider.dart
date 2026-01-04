// providers/history_provider.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/history_summary.dart';

class HistoryProvider with ChangeNotifier {
  List<HistorySummary> _summaries = [];
  bool _loading = false;
  String? _error;

  List<HistorySummary> get summaries => _summaries;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> fetchHistory(
      String memberId, String token, int fromId, int toId) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final url = Uri.parse(
          'http://ifeloduncms.com.ng/mobile_app2/mobile-api/member/$memberId/history?from=$fromId&to=$toId');
      final res = await http.get(
        url,
        headers: {'Authorization': 'Bearer $token'},
      );
      print("Fecthing response : ${res.body}");

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['data'] != null && data['data'] is List) {
          _summaries = (data['data'] as List)
              .map((item) =>
                  HistorySummary.fromJson(item as Map<String, dynamic>))
              .toList();
        }
      } else {
        _error = 'Error: ${res.body}';
      }
    } catch (e) {
      _error = e.toString();
    }
    _loading = false;
    notifyListeners();
  }
}
